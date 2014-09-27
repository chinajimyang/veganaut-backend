/**
 * Mongoose schema for a location.
 */

'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constants = require('../constants');
var Missions = require('../../app/models/Missions');

/**
 * Time in ms between two visitBonus missions: 3 weeks
 * TODO: This should go in a global config file somewhere
 * @type {number}
 */
var TIME_BETWEEN_TWO_VISIT_BONUS =  3 * 7 * 24 * 60 * 60 * 1000;

/**
 * Constants related to point computation
 */

// How much points decrease [unit: factor per millisecond]. Currently 10% per day.
var POINTS_DECREASE_FACTOR = Math.pow(0.90, 1.0 / (24*60*60*1000));

// Maximal available points for a location
var MAX_AVAILABLE_POINTS = 500;

// How much available points increase over time. Currently 10 per hour.
var AVAILABLE_POINTS_INCREASE_RATE = 10.0 / (60*60*1000);

var locationSchema = new Schema({
    coordinates: {type: [Number], index: '2d'},
    name: String,
    type: {type: String, enum: ['gastronomy', 'retail']},

    // Maps team names to their points at time updatedAt.
    points: {type: Schema.Types.Mixed, default: {}},

    // The team that last conquered this place. Used to break ties if teams
    // have the same number of points.
    team: String,

    // Points that are available at this location, at time updatedAt.
    availablePoints: {type: Number, default: AVAILABLE_POINTS_INCREASE_RATE * 24*60*60*1000},
    updatedAt: {type: Date, default: Date.now}
});

/**
 * Calculates when the given person is next allowed to do the visitBonus mission
 * at this location.
 * @param {Person} person
 * @param {function} next
 */
locationSchema.methods.computeNextVisitBonusDate = function(person, next) {
    var that = this;
    Missions.VisitBonusMission.findOne({
        location: this.id,
        person: person.id
    })
        .sort({ completed: 'desc' })
        .exec(function(err, mission) {
            if (err) {
                return next(err);
            }
            that._nextVisitBonusDate = that._nextVisitBonusDate || {};
            if (!mission) {
                // If there is no recent mission, one can get the bonus right now
                that._nextVisitBonusDate[person.id] = new Date();
            }
            else {
                // Some time after the last visitBonus, you get a new bonus
                that._nextVisitBonusDate[person.id] = new Date(mission.completed.getTime() + TIME_BETWEEN_TWO_VISIT_BONUS);
            }
            return next();
        }
    );
};

/**
 * Computes the points for this location as of now.
 * Points are stored in the database as of time updatedAt; whenever we need the
 * current score, we need to compute the changes since then.
 */
locationSchema.methods.computeCurrentPoints = function() {
    var that = this;
    var points = {};
    var elapsed = Date.now() - this.updatedAt.getTime();

    // Ensure the result contains points for every team
    _.each(constants.TEAMS, function(team) {
        that.points[team] = that.points[team] || 0;
    });

    // Points for each team diminish exponentially
    // TODO: exponential decrease gets too slow after some time... we should
    // have a minimal rate of decrease.
    _.forOwn(that.points, function(teamPoints, team) {
        points[team] = Math.round(teamPoints * Math.pow(POINTS_DECREASE_FACTOR, elapsed));
    });

    return points;
};

/**
 * Computes the available points for this location as of now.
 */
locationSchema.methods.computeCurrentAvailablePoints = function() {
    var elapsed = Date.now() - this.updatedAt.getTime();

    // Available points increase linearly.
    var available = this.availablePoints + elapsed * AVAILABLE_POINTS_INCREASE_RATE;
    available = Math.min(available, MAX_AVAILABLE_POINTS);
    available = Math.round(available);

    return available;
};

/**
 * Callback to notify the location that a new mission has been completed. The
 * location will then update its score.
 */
locationSchema.methods.notifyMissionCompleted = function(mission, next) {
    // Update the score of the location
    var points = this.computeCurrentPoints();
    var availablePoints = this.computeCurrentAvailablePoints();
    var team = this.team;
    var teamPoints = points[team] || -1;

    // Add up all the new points and decrease the availablePoints
    _.forOwn(mission.points.toObject(), function(p, t) {
        points[t] += Math.min(p, availablePoints);
        availablePoints -= Math.min(p, availablePoints);
    });

    // Check if a new team has the most points
    _.forOwn(points, function(p, t) {
        // Only if you make more points, do you get to be the new owner
        if (p > teamPoints) {
            team = t;
            teamPoints = p;
        }
    });

    // Save the new state
    this.points = points;
    this.markModified('points');
    this.availablePoints = availablePoints;
    this.team = team;
    this.updatedAt = Date.now();
    this.save(next);
};

/**
 * Returns this location ready to be sent to the frontend
 * @param {Person} [person]
 * @returns {{}}
 * TODO: this should be toJSON instead, it's called automatically (although we have an argument here...)
 */
locationSchema.methods.toApiObject = function (person) {
    var apiObj = _.pick(this, ['name', 'type', 'id', 'team', 'availablePoints']);

    // Add lat/lng in the format the frontend expects
    apiObj.lat = this.coordinates[0];
    apiObj.lng = this.coordinates[1];

    // Compute points as of now
    apiObj.points = this.computeCurrentPoints();

    // Compute availablePoints as of now
    apiObj.availablePoints = this.computeCurrentAvailablePoints();

    // Add nextVisitBonusDate if it's available
    if (typeof person !== 'undefined' &&
        typeof this._nextVisitBonusDate !== 'undefined' &&
        typeof this._nextVisitBonusDate[person.id] !== 'undefined')
    {
        apiObj.nextVisitBonusDate = this._nextVisitBonusDate[person.id];
    }

    return apiObj;
};


mongoose.model('Location', locationSchema);
