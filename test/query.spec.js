'use strict';

const expect = require('chai').expect;
const chai = require('chai')
    .use(require('chai-http'));
const server = require('../server/server');
const gql = require('graphql-tag');
const Promise = require('bluebird');
const cpx = require('cpx');

describe('query', () => {

  before(() => Promise.fromCallback(cb => cpx.copy('./data.json', './data/', cb)));

  describe('Single entity', () => {
    it('should execute a single query with relation', () => {
      const query = gql `
            query {
              viewer {
                orders(first: 1) {
                  edges {
                    node {
                      date
                      description
                      customer {
                        name
                        age
                      }
                    }
                  }
                }
              }
            }`;
      return chai.request(server)
                .post('/graphql')
                .send({
                  query
                })
                .then((res) => {
                  expect(res).to.have.status(200);
                  const result = res.body.data;
                  expect(result.viewer.orders.edges.length).to.equal(1);
                });
    });
  });
  describe('relationships', () => {
    it('should query related entity with nested relational data', () => {
      const query = gql `
                query {
                  viewer {
                    customers(first: 2) {
                      edges {
                        node {
                          name
                          age
                          orders {
                            edges {
                              node {
                                date
                                description
                                customer {
                                  name
                                  age
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
            `;
      return chai.request(server)
                .post('/graphql')
                .send({
                  query
                })
                .then((res) => {
                  expect(res).to.have.status(200);
                  expect(res.body.data.viewer.customers.edges.length).to.equal(2);
                });
    });
  });

});
