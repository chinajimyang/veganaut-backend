/**
 * This script prepares a database with test fixtures.
 */

'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');

require('../../app/models/Activity');
require('../../app/models/ActivityLink');
require('../../app/models/GraphNode');
require('../../app/models/Location');
require('../../app/models/Person');
var Activity = mongoose.model('Activity');
var ActivityLink = mongoose.model('ActivityLink');
var GraphNode = mongoose.model('GraphNode');
var Location = mongoose.model('Location');
var Person = mongoose.model('Person');
var Mission = mongoose.model('Mission');
var Product = require('../../app/models/Product');


var load = function(fixtures, done) {
    // Clear the db
    var tasks = [
        Activity.remove.bind(Activity),
        ActivityLink.remove.bind(ActivityLink),
        GraphNode.remove.bind(GraphNode),
        Person.remove.bind(Person),
        Location.remove.bind(Location),
        Mission.remove.bind(Mission),
        Product.remove.bind(Product)
    ];

    // Add all the fixtures
    _.each(fixtures, function(f) {
        tasks.push(f.save.bind(f));
    });

    // Execute all queries
    async.series(tasks, function(err) {
        if (err) {
            console.log('Error while loading fixtures: ', err);
            done(err);
        }
        done();
    });
};
exports.load = load;
