'use strict';

var h = require('../helpers_');

h.describe('Our API', function() {

    it('can connect to server', function() {
        h.runAsync(function(done) {
            h.request('GET', h.baseURL).end(function(res) {
                expect(res.statusCode).toBe(200);
                done();
            });
        });
    });
});
