module.exports = fxn => {

  'use strict';

  let expect = require('chai').expect;

  describe('Router', () => {

    const router = new fxn.Router();
    let route = null;

    it('Should parsePath correctly, given query string',  () => {

      expect(router.parsePath('/abc/def/?q=2')).to.equal('/abc/def');
      expect(router.parsePath('/abc/def/')).to.equal('/abc/def');
      expect(router.parsePath('/abc/def')).to.equal('/abc/def');

    });

    it('Should create route', () => {

      route = router.route('/abc/{id}');
      route.use(fxn.Controller);

      expect(route).to.exist;

    });

    it('Should find route', () => {

      expect(router.find('/abc')).to.equal(route);
      expect(router.find('/abc/')).to.equal(route);
      expect(router.find('/abc/1')).to.equal(route);
      expect(router.find('/abc?a=1')).to.equal(route);
      expect(router.find('/abc/?a=1')).to.equal(route);
      expect(router.find('/abc/1?a=1')).to.equal(route);

    });

    it('Should parse query parameters', () => {

      let qp = router.parseQueryParameters({a: '1', b: '2', c: '3'});

      expect(qp.a).to.equal('1');
      expect(qp.b).to.equal('2');
      expect(qp.c).to.equal('3');

    });

    it('Should parse body (string) from application/x-www-form-urlencoded', () => {

      let qp = router.parseBody('a=1&b=2&c=3', {'content-type': 'application/x-www-form-urlencoded'});

      expect(qp.a).to.equal('1');
      expect(qp.b).to.equal('2');
      expect(qp.c).to.equal('3');

    });

    it('Should parse body (string) from application/json', () => {

      let qp = router.parseBody('{"a":"1","b":"2","c":"3"}', {'content-type': 'application/json'});

      expect(qp.a).to.equal('1');
      expect(qp.b).to.equal('2');
      expect(qp.c).to.equal('3');

    });

    it('Should parse body (buffer) from application/x-www-form-urlencoded', () => {

      let qp = router.parseBody(new Buffer('a=1&b=2&c=3'), {'content-type': 'application/x-www-form-urlencoded'});

      expect(qp.a).to.equal('1');
      expect(qp.b).to.equal('2');
      expect(qp.c).to.equal('3');

    });

    it('Should parse body (buffer) from application/json', () => {

      let qp = router.parseBody(new Buffer('{"a":"1","b":"2","c":"3"}'), {'content-type': 'application/json'});

      expect(qp.a).to.equal('1');
      expect(qp.b).to.equal('2');
      expect(qp.c).to.equal('3');

    });

    it('Should parse body (string) from multipart/form-data', () => {

      let qp = router.parseBody('?\r\nContent-Disposition: form-data; name="testkey"\r\n\r\ntestvalue\r\n?', {'content-type': 'multipart/form-data;boundary=?'});

      expect(qp.testkey).to.equal('testvalue');

    });

    it('Should throw out body (string) from malformed multipart/form-data', () => {

      let qp = router.parseBody('bad?multipart\r\nform\r\ndata', {'content-type': 'multipart/form-data;boundary=?'});

      expect(Object.keys(qp).length).to.equal(0);

    });

    it('Should prepare route matches properly', () => {

      let routeData = router.prepare('::1', '/abc/123', 'GET', {}, '');

      expect(routeData.matches).to.exist;
      expect(routeData.matches[0]).to.equal('123');
      expect(routeData.route.id).to.equal('123');

    });

    it('Should dispatch routes', (done) => {

      router.dispatch(router.prepare('::1', '/abc/123', 'GET', {}, ''), (err, status, headers, data) => {
        try {
          expect(err).to.not.exist;
          expect(status).to.equal(501);
          return done();
        } catch (e) {
          return done(e);
        }
      });

    });

    it('Should dispatch routes if an IP address is not passed in', (done) => {

      router.dispatch(router.prepare(null, '/abc/123', 'GET', {}, ''), (err, status, headers, data) => {
        try {
          expect(err).to.not.exist;
          expect(status).to.equal(501);
          return done();
        } catch (e) {
          return done(e);
        }
      });

    });

  });

};
