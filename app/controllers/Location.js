'use strict';

var _ = require('lodash');
var async = require('async');

var mongoose = require('mongoose');
var Location = mongoose.model('Location');
var Visit = mongoose.model('Visit');

exports.location = function(req, res, next) {
    var location = new Location(_.assign(_.pick(req.body, 'name', 'type'), {
        coordinates: [req.body.lat, req.body.lng]
    }));

    // Create first visit at this location with the addLocation mission completed
    // TODO: this should probably go in the Location Model pre save or something, then one can also change FixtureCreator.location
    var visit = new Visit({
        person: req.user.id,
        location: location.id,
        completed: new Date(), // TODO: it should set this as default
        missions: [{
            type: 'addLocation',
            outcome: true
        }]
    });

    location.save(function(err) {
        if (err) {
            return next(err);
        }
        visit.save(function(err) {
            if (err) {
                return next(err);
            }
            return res.send(location.toApiObject());
        });
    });
};


exports.list = function(req, res, next) {
    Location.find(function(err, locations) {
        if (err) {
            return next(err);
        }

        async.each(locations,
            function(location, cb) {
                location.computeNextVisitBonusDate(req.user, cb);
            },
            function(err) {
                if (err) { return next(err); }
                locations = _.map(locations, function(l) {
                    return l.toApiObject(req.user);
                });
                return res.send(locations);
            });
    });
};
