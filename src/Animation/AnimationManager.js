var threebox = require('../Threebox.js');
var turf = require("@turf/turf");
var utils = require("../Utils/Utils.js");


function AnimationManager() {
    this.enrolledObjects = [];    
    this.previousFrameTime;
}

AnimationManager.prototype = {

    enroll: function(obj) {
        /* Extend the provided object with animation-specific properties and track in the animation manager */

        this.enrolledObjects.push(obj);

        // Give this object its own internal animation queue
        obj.animationQueue = [];

        obj.set = function(state, options) {
            //if duration is set, animate to the new state
            if ( options && options.duration > 0 ){
                var entry = {
                    type:'set',
                    parameters: {
                        start: Date.now(),
                        expiration: Date.now()+options.duration,
                        duration: options.duration
                    }
                }

                if (state.rotation) {
                    var c = obj.rotation
                    entry.parameters.startRotation = [c.x, c.y, c.z];
                    entry.parameters.rotationPerMs = [c.x, c.y, c.z].map(function(radian, index){
                        return (utils.radify(state.rotation[index])-radian)/(options.duration);
                    })
                }
                if (state.position) {
                    entry.parameters.startPosition = obj.coordinates;
                    entry.parameters.positionPerMs = obj.coordinates.map(function(px, index){
                        return (state.position[index]-px)/(options.duration);
                    });
                }

                this.animationQueue
                    .push(entry);   
            }


            //if no duration set, stop existing animations and go to that state immediately
            else {

                this.stop();
                state.rotation = utils.radify(state.rotation);
                this._setObject(state);

            }

            return this

        };

        obj.stop = function(){
            this.animationQueue = [];
            return this;
        }

        obj.setSpeed = function(options){
            var now = now;
            if (options.duration) options.expiration = now + options.duration;
            var animationEntry = {object:this, type: 'continuous', parameters:options};

            this.animationQueue.push({type: 'continuous', parameters:options});

            return this

        };

        obj.followPath = function (coordinates, options){

            //var easing = options.easing || 1;

            //var totalDuration = (totalDistance / lineGeojson.properties.speed) * 1000;

            var lineGeojson = turf.lineString(coordinates);
            var entry = {
                type: 'followPath', 
                parameters:{
                    start: now, 
                    distance: turf.lineDistance(lineGeojson, 'meters'), 
                    geometry:lineGeojson,
                    speed: options.speed || 10,
                    acceleration:  options.acceleration || 0,
                    trackHeading: true,
                    turnSpeed: utils.radify(options.turnSpeed) || utils.radify(3600)
                }
            };

            this.animationQueue
                .push(entry);

            return this;

        };

        obj.circlePoint = function(options){

            // radius, duration, start angle
            options.start = now;

            var entry = {
                type: 'circle',
                parameters: options
            }

            this.animationQueue
                .push(entry);

            return this;
        }

        obj._setObject = function (options){

            var p = options.position;
            var r = options.rotation;

            if (p) {
                this.coordinates = p;
                var c = threebox.projectToWorld(p);

                this.position.set(c[0],c[1], c[2])

            }

            if (r) {

                this.rotation.set(r[0],r[1],r[2])

            }
        };

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

            // cull expired animations
            if (options.expiration<now) {
                console.log('culled')

                object.animationQueue.splice(0,1);

                // set the start time of the next animation
                object.animationQueue[0].parameters.start = now;

                return
            }

            var sinceLastTick = (now-this.previousFrameTime)/1000;

            if (item.type === 'set'){

                var timeProgress = now - options.start;
                var newPosition, newRotation;

                if (options.positionPerMs) {
                    newPosition = options.startPosition.map(function(px, index){
                        return px+options.positionPerMs[index]*timeProgress
                    })
                }
                if (options.rotationPerMs) {
                    newRotation = options.startRotation.map(function(rad, index){
                        return rad+options.rotationPerMs[index]*timeProgress
                    })
                }

                object._setObject({position: newPosition, rotation:newRotation});

            }

            // handle continuous animations
            if (item.type === 'continuous'){

                if (options.position){

                    object.translateX(options.position[0]/sinceLastTick);
                    object.translateY(options.position[1]/sinceLastTick);
                    object.translateZ(options.position[2]/sinceLastTick);

                }

                if (options.rotation){

                    object.rotateX(options.rotation[0]/sinceLastTick);
                    object.rotateY(options.rotation[1]/sinceLastTick);
                    object.rotateZ(options.rotation[2]/sinceLastTick);

                }
            }

            if (item.type === 'followPath'){

                var timeProgress = (now-options.start) / 1000;
                var lineGeojson = options.geometry;
                var acceleration = options.acceleration;
                var turnSpeed = options.turnSpeed;

                //var fractionalProgress = Math.pow(1*Math.round(1*(timeProgress)) / totalDuration, easing);

                // default to duration for time
                var distanceProgress = options.speed*timeProgress+ 0.5 * acceleration * Math.pow(timeProgress,2);//totalDistance*fractionalProgress
                var currentLngLat = turf.along(lineGeojson, distanceProgress, 'meters').geometry.coordinates;
                var nextPosition = utils.project(currentLngLat);

                var toTurn;

                // if we need to track heading
                if (options.trackHeading){
                    //opposite/adjacent
                    var angle = (Math.atan2((nextPosition[1]-object.position.y),(nextPosition[0]-object.position.x))+0.5*Math.PI).toFixed(4);
                    var angleDelta = angle-object.rotation.z;

                    // if object needs to turn, turn it by up to the allowed turnSpeed
                    if (angleDelta !== 0) {
                        var xTurn = 0;
                        var yTurn = 0;
                        var zTurn = Math.sign(angleDelta) * Math.min(Math.abs(angleDelta), turnSpeed) * sinceLastTick;
                        toTurn = [xTurn, yTurn, object.rotation.z+zTurn];
                    }

                }

                else {
                    if (options.rotation){
                        console.log('rotation present!')
                    }
                }

                object._setObject({position: currentLngLat, rotation:toTurn});

                //if finished, flag this for removal next time around
                if (distanceProgress >= options.distance) options.expiration = now;

            }

            if (item.type === 'circle'){

                var timeProgress = (now-options.start) / 1000;
                var period = options.period;
                var radius = options.radius;
                var center = options.center;

                var angle = utils.radify((360 * timeProgress / period) );
                var destination = turf.destination(center, radius/1000, angle, 'kilometers');
                var coords = destination.geometry.coordinates;
                coords[2] = 500;
                object._setObject({position:coords, rotation:[0,0,angle/100]})
            }

        }

        this.previousFrameTime = now;
    }
}

module.exports = exports = AnimationManager;