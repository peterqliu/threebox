export default {
  input: "index",
  external: [
    "d3-array"
  ],
  output: {
    extend: true,
    file: "build/d3-geo.js",
    format: "umd",
    globals: {
      "d3-array": "d3"
    },
    name: "d3"
  }
};
