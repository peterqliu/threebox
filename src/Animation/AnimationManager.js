var threebox = require('../Threebox.js');
var utils = require("../utils/utils.js");
var validate = require("../utils/validate.js");

function AnimationManager(map) {

    this.map = map
    this.enrolledObjects = [];    
    this.previousFrameTime;

};

AnimationManager.prototype = {

    enroll: function(obj) {

        /* Extend the provided object with animation-specific properties and track in the animation manager */

        this.enrolledObjects.push(obj);

        // Give this object its own internal animation queue
        obj.animationQueue = [];

        obj.set = function(options) {

            //if duration is set, animate to the new state
            if (options.duration > 0 ){

                var newParams = {
                    start: Date.now(),
                    expiration: Date.now() + options.duration,
                    endState: {}
                }

                utils.extend(options, newParams);

                var translating = options.coords;
                var rotating = options.rotation;
                var scaling = options.scale || options.scaleX || options.scaleY || options.scaleZ;

                if (rotating) {
                    
                    var r = obj.rotation;
                    options.startRotation = [r.x, r.y, r.z];


                    options.endState.rotation = utils.types.rotation(options.rotation, options.startRotation);
                    options.rotationPerMs = options.endState.rotation
                        .map(function(angle, index){
                            return (angle-options.startRotation[index])/options.duration;
                        })
                }

                if (scaling) {
                    var s = obj.scale;
                    options.startScale = [s.x, s.y, s.z];
                    options.endState.scale = utils.types.scale(options.scale, options.startScale);

                    options.scalePerMs = options.endState.scale
                        .map(function(scale, index){
                            return (scale-options.startScale[index])/options.duration;
                        })                    
                }

                if (translating) options.pathCurve = new THREE.CatmullRomCurve3(utils.lnglatsToWorld([obj.coordinates, options.coords]));

                var entry = {
                    type:'set',
                    parameters: options
                }

                this.animationQueue
                    .push(entry);

                map.repaint = true;   
            }

            //if no duration set, stop object's existing animations and go to that state immediately
            else {
                this.stop();
                options.rotation = utils.radify(options.rotation);
                this._setObject(options);
            }

            return this

        };

        obj.stop = function(){
            this.animationQueue = [];
            return this;
        }

        obj.followPath = function (options, cb){

            var entry = {
                type: 'followPath', 
                parameters: utils._validate(options, defaults.followPath)
            };
                     
            utils.extend(
                entry.parameters, 
                {
                    pathCurve: new THREE.CatmullRomCurve3(
                        utils.lnglatsToWorld(options.path)
                    ),
                    start: Date.now(),
                    expiration: Date.now() + entry.parameters.duration,
                    cb: cb
                }
            );    

            this.animationQueue
                .push(entry);

            map.repaint = true;
            
            return this;
        };

        obj._setObject = function (options){

            var p = options.position; // lnglat
            var r = options.rotation; // radians
            var s = options.scale; // 
            var w = options.worldCoordinates; //Vector3
            var q = options.quaternion // [axis, angle]

            if (p) {
                this.coordinates = p;
                var c = utils.projectToWorld(p);
                this.position.copy(c)
            }

            if (r) this.rotation.set(r[0], r[1], r[2]);
            
            if (s) this.scale.set(s[0], s[1], s[2]);
            
            if (q) this.quaternion.setFromAxisAngle(q[0], q[1]);
            
            if (w) this.position.copy(w);

            map.repaint = true
        }
    },

    update: function(now) {

        if (this.previousFrameTime === undefined) this.previousFrameTime = now;

        var dimensions = ['X','Y','Z'];

        //iterate through objects in queue. count in reverse so we can cull objects without frame shifting
        for (var a = this.enrolledObjects.length-1; a>=0; a--){   

            var object = this.enrolledObjects[a];

            if(!object.animationQueue || object.animationQueue.length === 0) continue;

            //focus on first item in queue
            var item = object.animationQueue[0];
            var options = item.parameters;

            // if an animation is past its expiration date, cull it
            if (!options.expiration) {
                // console.log('culled')

                object.animationQueue.splice(0,1);

                // set the start time of the next animation
                if (object.animationQueue[0]) object.animationQueue[0].parameters.start = now;

                return
            }

            //if finished, jump to end state and flag animation entry for removal next time around. Execute callback if there is one
            var expiring = now >= options.expiration;

            if (expiring) {
                options.expiration = false;
                if (options.endState) object._setObject(options.endState);
                options.cb();
            }

            else {

                var timeProgress = (now - options.start) / options.duration;

                if (item.type === 'set'){

                    var objectState = {};

                    if (options.pathCurve) objectState.worldCoordinates = options.pathCurve.getPoint(timeProgress);

                    if (options.rotationPerMs) {
                        objectState.rotation = options.startRotation.map(function(rad, index){
                            return rad + options.rotationPerMs[index] * timeProgress * options.duration
                        })
                    }

                    if (options.scalePerMs) {
                        objectState.scale = options.startScale.map(function(scale, index){
                            return scale + options.scalePerMs[index]*timeProgress * options.duration
                        })
                    }

                    object._setObject(objectState);
                }

                if (item.type === 'followPath'){

                    var position = options.pathCurve.getPointAt(timeProgress);
                    objectState = {worldCoordinates: position};

                    // if we need to track heading
                    if (options.trackHeading){

                        var tangent = options.pathCurve
                        .getTangentAt(timeProgress)
                            .normalize();

                        var axis = new THREE.Vector3(0,0,0);
                        var up = new THREE.Vector3(0,1,0);

                        axis
                            .crossVectors(up, tangent)
                            .normalize();

                        var radians = Math.acos(up.dot(tangent));

                        objectState.quaternion = [axis, radians];

                    }

                    object._setObject(objectState);

                }
            }

        }

        this.previousFrameTime = now;
    }
}

const defaults = {
    followPath: {
        path: null,
        duration: 1000,
        trackHeading: true
    }
}
module.exports = exports = AnimationManager;