
const _ = require('lodash');

const {
  connectionArgs,
} = require('graphql-relay');

const { GraphQLObjectType } = require('graphql');
const { getType, getConnection } = require('../../types/type');
const { findAllRelated } = require('../../db');
const { connectionFromPromisedArray } = require('../../db/resolveConnection');

/**
 * Finds a user from an access token
 * @param {*} accessToken
 * @param {*} UserModel
 */
function findUserFromAccessToken(accessToken, UserModel) {
  if (!accessToken) return null;

  return UserModel.findById(accessToken.userId).then((user) => {
    if (!user) return Promise.reject(new Error('No user with this access token was found.'));
    return Promise.resolve(user);
  });
}

/**
 * Adds fields of all relationed models
 * @param {*} models
 */
function getRelatedModelFields(User) {
  const fields = {};

  _.forEach(User.relations, (relation) => {
    const model = relation.modelTo;

    fields[_.lowerFirst(relation.name)] = {
      args: Object.assign({
        filter: {
          type: getType('JSON'),
        },
        options: {
          type: getType('JSON'),
        },
      }, connectionArgs),
      type: getConnection(model.modelName),
      resolve: (obj, args, context) => {
        if (!context.accessToken) return null;

        args.order = args.filter && args.filter.order;

        return findUserFromAccessToken(context.accessToken, User)
          .then(user => connectionFromPromisedArray(findAllRelated(User, user, relation.name, args, context), args, model));
      },
    };
  });

  return fields;
}


/**
 * Create a me field for a given user model
 * @param {*} User
 */
function getMeField(User) {
  return {
    me: {
      type: getType(User.modelName),
      resolve: (obj, args, context) => {
        if (!context.accessToken) return null;

        return findUserFromAccessToken(context.accessToken, User);
      },
    },
  };
}

/**
 * Generates Viewer query
 * @param {*} models
 */
module.exports = function viewer(models, options) {
  const opts = Object.assign({}, {
    UserModel: 'User',
  }, options.viewer || {});

  const User = _.find(models, model => model.modelName === opts.UserModel);

  const Viewer = {
    resolve: () => ({}),
    type: new GraphQLObjectType({
      name: 'Viewer',
      description: 'Viewer',
      // interfaces: () => [nodeDefinitions.nodeInterface],
      fields: () => Object.assign(
        {},
        getMeField(User),
        getRelatedModelFields(User),
      ),
    }),
  };

  return Viewer;
};
