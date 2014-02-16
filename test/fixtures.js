/**
 * This script prepares a database with test fixtures.
 */

'use strict';

var mongoose = require('mongoose');
var async = require('async');

require('../app/models/Person');
require('../app/models/Activity');
require('../app/models/ActivityLink');
require('../app/models/GraphNode');
var Person = mongoose.model('Person');
var Activity = mongoose.model('Activity');
var ActivityLink = mongoose.model('ActivityLink');
var GraphNode = mongoose.model('GraphNode');


var setupFixtures = function (done) {
    var alice = new Person({
        email: 'foo@bar.baz',
        password: 'foobar',
        fullName: 'Alice Alison'
    });
    var bob = new Person({
        email: 'im@stoop.id',
        password: 'bestpasswordever',
        fullName: 'Bob Burton',
        gender: 'male'
    });
    var carol = new Person({
        email: 'son@ainbfl.at',
        password: 'you\'ll never guess',
        fullName: 'Carol',
        gender: 'other',
        address: 'Cäcilienstr. 5, 3006 Bern'
    });
    var dave = new Person({
        fullName: 'Dave Donaldsson'
    });

    var buyActivity = new Activity({
        name: 'Buy something vegan for ...',
        className: 'Shopping',
        givesVegBytes: false
    });

    var cookActivity = new Activity({
        name: 'Cook something vegan for ...',
        className: 'Cooking',
        givesVegBytes: true
    });


    var aliceBuysSomethingForBob = new ActivityLink({
        activity: buyActivity.id,
        sources: [alice.id],
        targets: [bob.id],
        location: 'Bern, Switzerland',
        startDate: '2014-01-10',
        success: true,
        referenceCode: 'Ff8tEQ'
    });

    var aliceWantsToBuySomethingForDave = new ActivityLink({
        activity: buyActivity.id,
        sources: [alice.id],
        targets: [dave.id],
        success: false,
        referenceCode: 'OiWCrB'
    });


    var aliceKnowsBob = new GraphNode({
        owner: alice.id,
        target: bob.id
    });

    var aliceKnowsDave = new GraphNode({
        owner: alice.id,
        target: dave.id
    });

    // TODO: use alice.save.bind(alice) instead of this proxy
    var proxy = function(fn, context) {
        return function() {
            return fn.apply(context, [].slice.call(arguments));
        };
    };

    var remove = Activity.remove;
    var save = alice.save;

    async.series([
        proxy(remove, Activity),
        proxy(remove, ActivityLink),
        proxy(remove, GraphNode),
        proxy(remove, Person),
        proxy(save, alice),
        proxy(save, bob),
        proxy(save, carol),
        proxy(save, dave),
        proxy(save, buyActivity),
        proxy(save, cookActivity),
        proxy(save, aliceBuysSomethingForBob),
        proxy(save, aliceWantsToBuySomethingForDave),
        proxy(save, aliceKnowsBob),
        proxy(save, aliceKnowsDave)
    ], function(err) {
        if (err) {
            done(err);
        }
        done();
    });
};
exports.setupFixtures = setupFixtures;


if (require.main === module) {
    mongoose.connect('mongodb://localhost/monkey', function(err) {
        if (err) {
            console.log('Could not connect to Mongo: ', err);
            process.exit();
        }
        setupFixtures(function() {
            mongoose.disconnect();
        });
    });
}
