module.exports = (() => {

  'use strict';

  const ExecutionQueue = require('./execution_queue.js');

  /**
  * Controller for handling HTTP requests
  * @class
  */
  class Controller {

    constructor(path, method, requestHeaders, params, responder) {

      this._path = path || '';
      this._method = method || '';
      this._requestHeaders = requestHeaders || {};

      this._headers = {};
      this._status = 200;

      this._responder = responder || (() => {});

      this._securityPolicies = {};

      this.params = params || {};

      this.middleware = new ExecutionQueue();
      this.renderware = new ExecutionQueue();

    }

    convertMethod(method, id) {

      let acceptMethods = {
        'GET': ['index', 'show'],
        'PUT': ['put', 'update'],
        'POST': ['create', 'post'],
        'DELETE': ['del', 'destroy'],
        'OPTIONS': ['options', 'options']
      };

      let hasId = !!id;

      method = method in acceptMethods ? method : 'GET';
      method = acceptMethods[method][hasId | 0];

      return method;

    }

    run() {

      this.before();

      this.middleware.exec(this, (err) => {

        if (err) {
          return this.httpError(err.statusCode || 500, err.message);
        }

        this[this.convertMethod(this._method, this.params.id)]();

      });

    }

    /**
    * Default "501 - Not Implemented" response
    */
    notImplemented() {
      this.status(501);
      this.render('Not Implemented');
    }

    /**
    * Intended to be overwritten when inherited. Run before middleware.
    *   Controller-specific middleware and renderware here
    */
    before() {}

    /**
    * Intended to be overwritten when inherited. Run after renderware.
    */
    after() {}

    /**
    * Method called when a route is hit with a GET request, if not first intercepted by custom Controller#index or Controller#show methods. Intended to be overwritten when inherited.
    */
    get() {
      this.notImplemented();
    }

    /**
    * Method called when a route is hit with a PUT request, if not first intercepted by custom Controller#update method. Intended to be overwritten when inherited.
    */
    put() {
      this.notImplemented();
    }

    /**
    * Method called when a route is hit with a POST request, if not first intercepted by custom Controller#create method. Intended to be overwritten when inherited.
    */
    post() {
      this.notImplemented();
    }

    /**
    * Method called when a route is hit with a DELETE request, if not first intercepted by custom Controller#destroy method. Intended to be overwritten when inherited.
    */
    del() {
      this.notImplemented();
    }

    /**
    * Method called when a route is hit with an OPTIONS request. Typically unused, exists for CORS purposes.
    */
    options() {
      this.status(200);
      this.setHeader('Content-Type', 'text/plain');
      this.render('200 OK');
    }

    index() { this.get(); }
    show() { this.get(); }
    update() { this.put(); }
    create() { this.post(); }
    destroy() { this.del(); }

    /**
    * Set HTTP headers to be used by the outgoing http.ServerResponse
    * @param {Object} object Object containing key-value pairs for HTTP headers
    * @return {Object} The headers object created
    */
    setHeaders(object) {
      return (this._headers = Object.keys(object).reduce((o, key) => {
        key = key.split('-').map(function(v) {
          return v[0].toUpperCase() + v.substr(1).toLowerCase();
        }).join('-');
        o[key.toLowerCase()] = object[key];
        return o;
      }, {}));
    }

    /**
    * Uppercase all words in header key.
    * @param {String} key
    * @return {String}
    */
    _parseHeaderKey(key){
      key = key.split('-').map(function(v) {
        return v[0].toUpperCase() + v.substr(1).toLowerCase();
      }).join('-');

      return key;
    }

    /**
    * Set a specific response header
    * @param {String} key
    * @param {String} value
    */
    setHeader(key, value) {

      key = this._parseHeaderKey(key);

      if (key === 'Content-Type' && value.indexOf(';') === -1 && (
        value === 'application/javascript' ||
        value === 'application/json' ||
        value.indexOf('text/') === 0
      )) {
        value = value + '; charset=utf-8';
      }

      return this._headers[key] = value;

    }

    /**
     * Add a value to a existing specific response header. If header not exists create it.
     * @param {String} key
     * @param {String} value
     */
    appendHeader(key, value) {
      key = this._parseHeaderKey(key);
      let removeWhitespace = v => v.replace(/^\s*(.*)\s*$/, '$1');
      let values = (this._headers[key] || '').split(';').map(removeWhitespace);
      values[0] = values[0].split(',').map(removeWhitespace);
      values[0].indexOf(value) === -1 && values[0].push(value);
      values[0] = values[0].join(', ');
      return (this._headers[key] = values.join('; '));
    }

    /**
    * Get the value of a specific response header
    * @param {String} key
    * @param {String} value Default value returned if not found
    */
    getHeader(key, value) {
      key = this._parseHeaderKey(key);

      return this._headers.hasOwnProperty(key) ? this._headers[key] : value;
    }

    /**
    * Set HTTP status code for this response
    * @param {Number} code
    */
    status(code) {
      return this._status = code;
    }

    /**
    * The current HTTP status code expected to be used by the outgoing http.ServerResponse
    * @return {number}
    */
    getStatus() {
      return this._status;
    }

    /**
    * Using API formatting, send an http.ServerResponse indicating there was an Internal Server Error (500)
    * @param {string} msg Error message to send
    * @return {boolean}
    */
    error(msg) {
      this.status(500);
      this.render(msg || 'Internal Server Error');
      return true;
    }

    /**
    * Using API formatting, send a http.ServerResponse error with a specific HTTP response status code
    * @param {Number} code HTTP response status code
    * @param {string} msg Response message to send
    * @return {boolean}
    */
    httpError(code, msg) {
      this.status(code);
      this.render(msg);
      return true;
    }

    /**
    * Render an HTTP response (end ServerResponse) based on provided data
    * @param {Object} data Can be Buffer, String, or Plain Object
    */
    render(data) {

      if (data instanceof Buffer) {

        this.getHeader('Content-Type') || this.setHeader('Content-Type', 'application/octet-stream');

      } else {

        if (typeof data === 'object' && data !== null) {
          this.getHeader('Content-Type') || this.setHeader('Content-Type', 'application/json');
          data = JSON.stringify(data, null, 2);
        }

        data = data + '';
        data = new Buffer(data);

      }

      this.renderware.exec(this, data, (e, data) => {

        if (e) {
          this._responder(e);
          this.after();
          return;
        }

        this.getHeader('Content-Type') || this.setHeader('Content-Type', 'text/html');
        this.getHeader('X-Powered-By') || this.setHeader('X-Powered-By', 'fxn');
        this._responder(null, this._status, this._headers, data);
        this.after();

      });

    }

    /**
    * Specifies CORS (cross origin resource sharing) headers.
    * @param {string} value Use '*' for a generic API service that accepts requests from anywhere, otherwise specific a domain.
    * @return {this}
    */
    allowOrigin(value) {

      this.setHeader('Access-Control-Allow-Origin', value);
      this.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      this.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

      return this;

    }

    /**
    * Add Content-Security-Policy headers
    * @param {string} directive The directive of the security policy
    * @param {string} src The value (domain) to add to the policy
    */
    securityPolicy(directive, src) {

      if (!src.match(/^https?:\/\/.+$/)) {

        if (['none', 'self', 'unsafe-inline', 'unsafe-eval'].indexOf(src) === -1) {
          throw new Error(`Invalid security policy src: "${src}"`);
        }

        src = `'${src}'`;

      }

      directive = directive.toLowerCase();
      src = src.toLowerCase();

      this._securityPolicies[directive] = this._securityPolicies[directive] || {};
      this._securityPolicies[directive][src] = true;

      let contentSecurityPolicy = Object.keys(this._securityPolicies)
        .map(policy => `${policy} ${Object.keys(this._securityPolicies[policy]).join(' ')}`)
        .join('; ')

      return this.setHeader('Content-Security-Policy', contentSecurityPolicy);

    }

    /**
    * Creates a 302 redirect to the desired location
    * @param {string} location
    */
    redirect(location) {
      this.status(302);
      this.setHeader('Location', location);
      this.render();
    }

  }

  return Controller;

})();