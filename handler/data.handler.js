var _ = require("lodash");
var faker = require("faker");
var bcrypt = require("bcryptjs");
var fs = require("fs");
var conversion = require("phantom-html-to-pdf")();
var globalConfig = require("../globalConfig");
var tagValidators = require("../tables/tagvalidators");
const axios = require("axios");
var FormData = require("form-data");
// const { CanvasRenderService } = require("chartjs-node-canvas");
var restrictedTables = [
  "infocenter",
  "relationship",
  "user",
  "role",
  "userreadabledata",
  "table",
  "relationmapper",
  "tagvalidator",
  "changeobserver",
  "features"
];
var fieldsToBePushedAndRemoved = [
  "rolesAllowedToRead",
  "rolesAllowedToWrite",
  "rolesAllowedToUpdate",
  "idsAllowedToRead",
  "idsAllowedToWrite",
  "idsAllowedToUpdate",
  "created_at",
  "updated_at"
];
var DEFAULTNUMBEROFROWSTORETURN = globalConfig.defaultTotalRowCount;
module.exports = {
  insert: insert,
  update: update,
  delete: deleteData,
  getData: getData,
  addRelation: addRelationShip,
  getRelationData: getRelationData,
  uploadFileHandler: uploadFileHandler,
  getFiles: getFiles,
  getFeatures: getFeatures,
  generatePdf: generatePdf,
  updatePassword: updatePassword,
  sendMail: sendMail,
  deleteFiles: deleteFiles,
  deleteData: deleteData
};
/**
 * inserting data in the table
 * @param {*} tablename (string)
 * @param {*} data (object)
 */
function insert(request) {
  var tablename = request.body.table;
  var data = request.body.data;
  var tag = request.body.data.tag;
  // removing the permissions if some hacker tries to add them with data source
  data = removePermissionRelatedData(data, fieldsToBePushedAndRemoved);
  data.created_at = new Date();
  return new Promise(function (resolve, reject) {
    if (tables[origin][tablename]) {
      checkTagValidator(request)
        .then(result => {
          if (result) {
            if (restrictedTables.includes(tablename)) {
              reject({
                status: false,
                message: "you are not allowed to perform any kind of action to " +
                  tablename +
                  " table"
              });
            }
            if (!data._id) {
              reject({
                status: false,
                message: "no item id found in the payload"
              });
            }
            /**
             * checking permission whether the current token user has permission to do action
             */
            checkPermission(request, "insert")
              .then(result => {
                /**
                 * getting default permission set for the table
                 */
                getDefaultPermission(tablename)
                  .then(defaultPermissions => {
                    /**
                     * adding default permissions with the data to be saved
                     */
                    if (defaultPermissions) {
                      Object.keys(defaultPermissions).forEach(function (
                        key,
                        idx
                      ) {
                        if (defaultPermissions[key] == "owner") {
                          data[key] = request.userInfo && request.userInfo.userId || request.body.data.user_id;
                        } else {
                          data[key] = defaultPermissions[key];
                        }
                      });

                      tables[origin][tablename].create(data, function (
                        err,
                        docs
                      ) {
                        if (err) {
                          if (err.code == 11000)
                            return reject({
                              status: false,
                              message: "Duplicate item id found"
                            });
                          else {
                            return reject({
                              status: false,
                              message: err.message
                            });
                          }
                        }
                        return resolve({
                          status: true,
                          itemId: docs._id
                        });
                      });
                    } else {
                      resolve({
                        status: false,
                        message: "sorry no default permission found for the table " +
                          tablename
                      });
                    }
                  })
                  .catch(error => {
                    reject(error);
                  });
              })
              .catch(error => {
                reject(error);
              });
          } else {
            reject({
              status: false,
              message: "Tag Validation faild for " + tag
            });
          }
        })
        .catch(error => {
          reject(error);
        });
    } else {
      resolve({
        status: false,
        message: "No table found with name " + tablename
      });
    }
  });
}

/**
 * deleting data from the table
 * @param {*} tablename (string)
 * @param {*} data (object)
 */
function deleteData(request) {
  var tablename = request.body.table;
  var query = request.body.query;
  return new Promise(function (resolve, reject) {
    if (tables[origin][tablename]) {
      /* users permission checking condition added */
      let permissionValueAdding = {
        $or: [{
            rolesAllowedToRead: {
              $in: request.userInfo.roles
            }
          },
          {
            idsAllowedToRead: {
              $in: request.userInfo.userId
            }
          }
        ]
      };
      query = _.merge(query, permissionValueAdding);
      tables[origin][tablename].deleteMany(query, (err) => {
        if (!err) {
          resolve({
            status: true,
            message: "Deletion succesfull"
          });
        }
      });
    } else {
      resolve({
        status: false,
        message: "No table found with name " + tablename
      });
    }
  });
}
/**
 * Update function call handler
 * @param {*} request
 */
function update(request) {
  return new Promise(function (resolve, reject) {
    var tablename = request.body.table;
    var data = request.body.data;
    var tag = request.body.data.tag;
    var currenUserRole = request.userInfo.roles;
    var currentUserId = request.userInfo.userId;
    // removing the permissions if some hacker tries to add them with data source
    data = removePermissionRelatedData(data, fieldsToBePushedAndRemoved);
    data.updated_at = new Date();
    if (tables[origin][tablename]) {
      checkTagValidator(request)
        .then(result => {
          if (result) {
            if (restrictedTables.includes(tablename)) {
              reject({
                status: false,
                message: "you are not allowed to perform any kind of action to " +
                  tablename +
                  " table"
              });
            }
            if (!data._id) {
              reject({
                status: false,
                message: "no item id found in the payload"
              });
            } else {
              checkPermission(request, "update")
                .then(res => {
                  checkPermissionToUpdate(
                      tablename,
                      data._id,
                      currenUserRole,
                      currentUserId,
                      request
                    )
                    .then(result => {
                      changeObserver(request).then(observerResponse => {
                        if (observerResponse) {
                          tables[origin][tablename].updateOne({
                              _id: data._id
                            },
                            data,
                            (err, response) => {
                              if (err) return reject(err);

                              if (response.ok)
                                resolve({
                                  status: true,
                                  itemId: data._id,
                                  message: "update fuccessfull"
                                });
                            }
                          );
                        }
                      });
                    })
                    .catch(err => {
                      reject(err);
                    });
                })
                .catch(err => {
                  reject(err);
                });
            }
          } else {
            reject({
              status: false,
              message: "Tag Validation faild for " + tag
            });
          }
        })
        .catch(err => {
          reject(err);
        });
    } else {
      resolve({
        status: false,
        message: "No table found with name " + tablename
      });
    }
  });
}

function changeObserver(request) {
  var tablename = request.body.table;
  var data = request.body.data;
  var tag = request.body.data.tag;
  var currenUserRole = request.userInfo.roles;
  var currentUserId = request.userInfo.userId;
  var parentData = {};
  var counter = 0;
  console.log("change observer called");
  return new Promise((resolve, reject) => {
    tables[origin]["changeobserver"].find({
        parentTable: tablename
      },
      function (err, docs) {
        if (!err) {
          if (docs && docs.length) {
            console.log("change observer data found");
            tables[origin][tablename].find({
                _id: data._id
              },
              (error, parentTableData) => {
                parentData = parentTableData[0];
                docs.forEach(element => {
                  if (
                    tables[origin][element.childTable] &&
                    data[element.parentField]
                  ) {
                    tables[origin][element.childTable].update({
                        [element.childQueryField]: parentData["id"]
                      }, {
                        [element.childField]: data[element.parentField]
                      }, {
                        multi: true
                      },
                      (err, info) => {
                        if (!err && info.ok) {
                          if (counter != docs.length - 1) {
                            counter++;
                          } else {
                            console.log(
                              "change observer data update successful"
                            );
                            resolve(true);
                          }
                        }
                      }
                    );
                  } else {
                    resolve(true);
                    console.log(
                      "Table not found or the field is not updating which is there to update"
                    );
                  }
                });
              }
            );
          } else {
            console.log("No change observer data found");
            resolve(true);
          }
        }
      }
    );
  });
}

/**
 * Query the data in the database
 * @param {*} request (whole request object)
 */
function getData(request) {
  var queryfields = null;
  var tablename = request.body.table;
  var populateConfig = request.body.populate ? request.body.populate : null;
  var query = request.body.query;
  var page = request.body.page ? request.body.page : 0;
  var rowsPerPage = request.body.count ?
    request.body.count :
    DEFAULTNUMBEROFROWSTORETURN;
  var fields =
    request.body.fields && request.body.fields.length ?
    request.body.fields :
    null;
  return new Promise(function (resolve, reject) {
    if (tables[origin][tablename]) {
      getUserReadableData(tablename)
        .then(function (readableFields) {
          /** if fields presents in the request body then check that first
           * else use the user readable fields coming from table userreadable data fields
           */
          if (fields) {
            var falseList = [];
            fields.forEach(element => {
              let ispresent = readableFields.includes(element);
              if (!ispresent) {
                falseList.push(element);
              }
            });
            if (falseList.length) {
              reject({
                status: false,
                fields: falseList,
                message: "your query fields are not present in the user readable list"
              });
            } else {
              queryfields = fields.join(" ");
            }
          } else {
            queryfields = readableFields.join(" ");
          }
          /* users permission checking condition added */
          if (request.userInfo && request.headers.authorization != "admin_credentials") {
            let permissionValueAdding = {
              $or: [{
                  rolesAllowedToRead: {
                    $in: request.userInfo.roles
                  }
                },
                {
                  idsAllowedToRead: {
                    $in: request.userInfo.userId
                  }
                }
              ]
            };
            query = _.merge(query, permissionValueAdding);
          }
          pullDataWithFields(
              tablename,
              query,
              queryfields,
              page,
              rowsPerPage,
              populateConfig,
              request
            )
            .then(docs => {
              getTotalCount(tablename, query, request)
                .then(count => {
                  resolve({
                    status: true,
                    data: docs,
                    totalCount: count
                  });
                })
                .catch(error => {
                  reject(error);
                });
            })
            .catch(error => {
              reject(error);
            });
        })
        .catch(function (err) {
          reject(err);
        });
    } else {
      resolve({
        status: false,
        message: "No table found with name " + tablename
      });
    }
  });
}

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function merge_Objects(obj1, obj2) {
  var obj3 = {};
  for (var attrname in obj1) {
    obj3[attrname] = obj1[attrname];
  }
  for (var attrname in obj2) {
    obj3[attrname] = obj2[attrname];
  }
  return obj3;
}

function pushNewDataToArray(destinationArray, operandArray) {
  operandArray.forEach(element => {
    destinationArray.push(element);
  });
  return destinationArray;
}

function removePermissionRelatedData(destinationObject, operandArray) {
  var newobj = _.omit(destinationObject, operandArray);

  return newobj;
}
/**
 * Removing security fields from population fields
 * @param {*} array
 */
function removeSecurityFieldsFromPopulation(array) {
  let result = [];
  array.forEach(element => {
    if (!fieldsToBePushedAndRemoved.includes(element)) {
      result.push(element);
    }
  });
  return result;
}
/**
 * Get data from table
 * @param {*} tablename (string)
 * @param {*} query (object)
 * @param {*} fields ([string])
 */
function pullDataWithFields(
  tablename,
  query,
  fields,
  page,
  rowsPerPage,
  populateConfig,
  request
) {
  var skip = page === 0 ? 0 : rowsPerPage * page;
  let populationFields = [];
  let dataQuery = tables[origin][tablename].find(query, fields);
  // configuring populating config
  if (populateConfig && populateConfig.length) {
    populateConfig.forEach(populate => {
      if (populate.property && populate.fields.length) {
        populationFields = populate.fields.length ?
          removeSecurityFieldsFromPopulation(populate.fields) :
          null;
        if (populationFields.length) {
          populationFields = populationFields.join(" ");
          dataQuery.populate(populate.property, populationFields);
        }
      }
    });
  }
  if (request.body.orderBy) {
    if (request.body.orderType) {
      if (request.body.orderType == "ASC") {
        dataQuery.sort(request.body.orderBy);
      } else if (request.body.orderType == "DESC") {
        dataQuery.sort("-" + request.body.orderBy);
      }
    } else {
      dataQuery.sort(request.body.orderBy);
    }
  }
  return new Promise((resolve, reject) => {
    dataQuery
      .skip(skip)
      .limit(rowsPerPage)
      .exec((err, docs) => {
        if (err) reject(err);
        resolve(docs);
      });
  });
}
/**
 * Getting total number of count
 * @param {*} tableName
 * @param {*} query
 */
function getTotalCount(tableName, query, request) {
  return new Promise((resolve, reject) => {
    tables[origin][tableName].find(query).count(function (err, count) {
      if (err) reject(err);
      else resolve(count);
    });
  });
}
/**
 * Getting user Readable data fields from table
 * @param {*} tablename
 */
function getUserReadableData(tablename) {
  return new Promise(function (resolve, reject) {
    tables[origin]["userreadabledata"].find({
        tableName: tablename
      },
      "readableFields",
      function (err, docs) {
        if (err) return reject(err);
        if (docs && docs.length) {
          resolve(docs[0].readableFields);
        } else {
          reject({
            status: false,
            message: "no user readable data found"
          });
        }
      }
    );
  });
}
/**
 * getting default permissions for the table
 * @param {*} tableName
 */
function getDefaultPermission(tableName) {
  return new Promise((resolve, reject) => {
    tables[origin]["table"].find({
        tableName: tableName
      },
      (error, docs) => {
        if (error) reject(error);
        if (docs && docs.length) resolve(docs[0].defaultPermission);
        else resolve(null);
      }
    );
  });
}
/**
 * checking if current token user has permission to do the action
 * @param {*} request
 * @param {*} permissionType
 * @returns boolean
 */
function checkPermission(request, permissionType) {
  var tableName = request.body.table;
  var currenUserRole = request.userInfo && request.userInfo.roles ? request.userInfo.roles : null;
  var permissionFields = {
    insert: "defaultRolesToWrite",
    update: "defaultRolesToUpdate"
  };

  return new Promise((resolve, reject) => {
    if (currenUserRole) {
      tables[origin]["table"].find({
          tableName: tableName
        },
        (err, docs) => {
          if (err) reject(err);
          if (docs && docs.length) {
            var rolesWhoPermitted = docs[0][permissionFields[permissionType]];
            currenUserRole.forEach(role => {
              if (rolesWhoPermitted.includes(role)) {
                return resolve(true);
              }
            });
            return reject({
              status: false,
              message: "You are not permitted for this action"
            });
          } else {
            reject({
              status: false,
              message: "No permission found for your action"
            });
          }
        }
      );
    } else {
      resolve(true);
    }
  });
}
/**
 * checking if the current token user has permission to update the specific data
 * @param {*} tablename
 * @param {*} itemId
 * @param {*} roles
 * @param {*} userId
 * @returns boolean
 */
function checkPermissionToUpdate(tablename, itemId, roles, userId, request) {
  return new Promise((resolve, reject) => {
    /**
     * checking if it satisfies rolesAllowedToUpdate or idsAllowedToUpdate
     */
    var query = {
      _id: itemId,
      $or: [{
          rolesAllowedToUpdate: {
            $in: roles
          }
        },
        {
          idsAllowedToUpdate: {
            $in: [userId]
          }
        }
      ]
    };
    tables[origin][tablename].find(query, (err, docs) => {
      if (err) reject(err);
      if (docs && docs.length) {
        resolve(true);
      } else {
        reject({
          result: false,
          message: "You are not permitted to update this data"
        });
      }
    });
  });
}

/**
 * Add relationship data handler function
 * @param {*} data
 */
function addRelationShip(data) {
  return new Promise((resolve, reject) => {
    checkRelationMapper(data.parentTableName, data.childTableName)
      .then(result => {
        checkAndInsertDataToRelationShipTable(data)
          .then(insertResult => {
            resolve(insertResult);
          })
          .catch(relationError => {
            reject(relationError);
          });
      })
      .catch(err => {
        reject({
          status: false,
          message: "relation mapper not found"
        });
      });
  });
}

/**
 * checking if relationship mapper presents or not
 * @param {*} parentTablename
 * @param {*} childTablename
 */
function checkRelationMapper(parentTablename, childTablename) {
  return new Promise((resolve, reject) => {
    tables.relationmapper.find({
        parentTableName: parentTablename,
        childTableName: childTablename
      },
      (err, docs) => {
        if (err) reject(err);
        if (docs && docs.length) {
          resolve(true);
        } else {
          reject({
            status: false,
            message: "no relation mapper found between tables"
          });
        }
      }
    );
  });
}
/**
 * checking data existence and inserting into the relationship table
 * @param {*} data
 */
function checkAndInsertDataToRelationShipTable(data) {
  var parentTableName = data.parentTableName;
  var childTableName = data.childTableName;
  var parentId = data.parentTableId;
  var childId = data.childTableId;
  return new Promise((resolve, reject) => {
    // if parent table has data
    tables[parentTableName].find({
        _id: parentId
      },
      (err, docs) => {
        if (err) {
          return reject({
            status: false,
            message: err
          });
        }
        if (docs && docs.length) {
          // check if child table has data
          tables[childTableName].find({
              _id: childId
            },
            (error, childDocs) => {
              if (error) {
                return reject({
                  status: false,
                  message: error
                });
              }
              // if everything ok then adds data to relationship table
              if (childDocs && childDocs.length) {
                tables.relationship.create(
                  data,
                  (relationerr, relationData) => {
                    if (relationerr) return reject(relationerr);
                    return resolve({
                      status: true,
                      itemId: relationData._id,
                      message: "relationship added successfully"
                    });
                  }
                );
              } else {
                return reject({
                  status: false,
                  message: "child table data not inserted yet"
                });
              }
            }
          );
        } else {
          return reject({
            status: false,
            message: "Parent table data not inserted yet"
          });
        }
      }
    );
  });
}
/**
 * getting relational data
 * @param {*} request
 */
function getRelationData(request) {
  var data = request.body;
  return new Promise((resolve, reject) => {
    // checking if botht table has relation mapper permission
    checkRelationMapper(data.parentTableName, data.childTableName)
      .then(result => {
        tables.relationship.find(data, (err, docs) => {
          if (err) reject(err);

          if (docs && docs.length) {
            // getting user readable data for child table
            getUserReadableData(data.childTableName)
              .then(userReadableData => {
                let childTableIds = [];
                docs.forEach((value, index) => {
                  if (!childTableIds.includes(value.childTableId))
                    childTableIds.push(value.childTableId);
                });
                let queryfields = userReadableData.join(" "); // readable fields join
                let query = {
                  _id: {
                    $in: childTableIds
                  },
                  $or: [{
                      rolesAllowedToRead: {
                        $in: request.userInfo.roles
                      }
                    },
                    {
                      idsAllowedToRead: {
                        $in: request.userInfo.userId
                      }
                    }
                  ]
                };
                // finding the child tables data
                tables[data.childTableName].find(
                  query,
                  queryfields,
                  (error, childData) => {
                    if (error) return reject(error);
                    return resolve({
                      status: true,
                      data: childData
                    });
                  }
                );
              })
              .catch(erroReadable => {
                return reject(erroReadable);
              });
          } else {
            return resolve({
              status: true,
              message: "sorry no data found"
            });
          }
        });
      })
      .catch(error => {
        reject(error);
      });
  });
}
/**
 * Uploading file handler addeed
 * @param {*} fileObject
 */
function uploadFileHandler(request) {
  return new Promise((resolve, reject) => {
    if (!request.file) {
      reject({
        status: false,
        message: "either no file or file form name not corrent"
      });
    } else {
      let file = request.file;
      const fileId = faker.random.uuid();
      // file.path = baseUrl + file.path;
      filename = request.file.filename;
      const insertPayload = {
        body: {
          table: "file",
          data: {
            _id: fileId,
            fileName: filename,
            fileUrl: file.path,
            tag: "Is-A-File",
            metaData: {
              originalname: request.file.originalname
            }
          }
        },
        userInfo: request.userInfo
      };
      insert(insertPayload)
        .then(response => {
          resolve({
            status: true,
            fileId: response.itemId
          });
        })
        .catch(err => {
          reject({
            status: false,
            message: err
          });
        });
    }
  });
}
/**
 * getFile url endpoint added
 * @param {*} request
 */
function getFiles(request) {
  return new Promise((resolve, reject) => {
    let query = {
      _id: request.body.fileId,
      $or: [{
          rolesAllowedToRead: {
            $in: request.userInfo.roles
          }
        },
        {
          idsAllowedToRead: {
            $in: request.userInfo.userId
          }
        }
      ]
    };
    tables[origin]["file"].find(query, (err, docs) => {
      if (docs.length) {
        resolve({
          fileName: docs[0].fileName,
          fileLink: docs[0].fileUrl
        });
      } else {
        reject({
          status: false,
          message: "no fle information found"
        });
      }
    });
  });
}

/**
 * delete file url endpoint added
 * @param {*} request
 */
function deleteFiles(request) {
  return new Promise((resolve, reject) => {
    let query = {
      _id: request.body.fileId,
      $or: [{
          rolesAllowedToRead: {
            $in: request.userInfo.roles
          }
        },
        {
          idsAllowedToRead: {
            $in: request.userInfo.userId
          }
        }
      ]
    };
    fs.unlink(globalConfig.storageLocation + request.body.fileName, err1 => {
      if (err1) {
        reject({
          status: false,
          message: JSON.stringify(err1)
        });
      } else {
        tables[origin]["file"].deleteOne(query, (err, docs) => {
          if (!err) {
            resolve({
              status: true,
              message: "File deleted succesfully"
            });
          } else {
            reject({
              status: false,
              message: "No fle information found"
            });
          }
        });
      }
    });
  });
}
/**
 * check if tag validator is valid or not
 * @param {*} request
 */
function checkTagValidator(request) {
  return new Promise((resolve, reject) => {
    var tablename = request.body.table;
    var data = request.body.data;
    var tag = request.body.data.tag;
    if (tag) {
      if (tagValidator[origin][tag]) {
        if (tagValidator[origin][tag]["table"] == tablename) {
          if (tagValidator[origin][tag]["shouldvalidate"]) {
            tagValidators[tag].validate(data).then(result => {
              resolve(result);
            });
          } else {
            resolve(true);
          }
        } else {
          reject({
            status: false,
            message: `sorry tag ${tag} is not applicable for table ${tablename}`
          });
        }
      } else {
        reject({
          status: false,
          message: "sorry no tag validator found with the given tag"
        });
      }
    } else {
      reject({
        status: false,
        message: "sorry no tag found in the payload"
      });
    }
  });
}

function getFeatures(request) {
  let permissionValueAdding = {
    $or: [{
        rolesAllowedToRead: {
          $in: request.userInfo.roles
        }
      },
      {
        idsAllowedToRead: {
          $in: request.userInfo.userId
        }
      }
    ]
  };
  return new Promise((resolve, reject) => {
    tables[origin]["feature"].find(
      permissionValueAdding,
      "featureName",
      (err, features) => {
        if (!err) {
          if (features.length) {
            resolve({
              status: true,
              data: features
            });
          } else {
            reject({
              status: false,
              message: "No feature found"
            });
          }
        } else {
          reject({
            status: false,
            message: err
          });
        }
      }
    );
  });
}

function randomScalingFactor() {
  return Math.floor(Math.random() * 100000 + 1);
}

function generatePdf(req) {
  return new Promise((resolve, reject) => {
    const width = 900;
    const height = 400;
    // const configuration = {
    //     type: 'line',
    //     data: {
    //         labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    //         datasets: [{
    //                 label: 'Pending',
    //                 data: [
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor()
    //                 ],
    //                 backgroundColor: 'rgba(255, 99, 132, 0.2)',
    //                 borderColor: 'rgba(255,99,132,1)',
    //                 borderWidth: 1
    //             },
    //             {
    //                 label: 'Done',
    //                 data: [
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor()
    //                 ],
    //                 backgroundColor: 'rgba(54, 162, 235, 0.2)',
    //                 borderColor: 'rgba(54, 162, 235, 1)',
    //                 borderWidth: 1
    //             },
    //             {
    //                 label: 'In Progress',
    //                 data: [
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor(),
    //                     randomScalingFactor()
    //                 ],
    //                 backgroundColor: 'rgba(255, 206, 86, 0.2)',
    //                 borderColor: 'rgba(255, 206, 86, 1)',
    //                 borderWidth: 1
    //             }
    //         ]
    //     },
    // options: {
    //     scales: {
    //         xAxes: [{
    //             stacked: false,
    //         }],
    //         yAxes: [{
    //             stacked: true
    //         }]
    //     }
    // }
    // };
    const configuration = {
      type: "line",
      data: req.body.pdfData,
      options: {
        scales: {
          xAxes: [{
            stacked: false
          }],
          yAxes: [{
            stacked: true,
            ticks: {
              min: 0,
              stepSize: 1,
              callback: value => value
            }
          }]
        }
      }
    };
    // const chartCallback = ChartJS => {
    //   // Global config example: https://www.chartjs.org/docs/latest/configuration/
    //   ChartJS.defaults.global.elements.rectangle.borderWidth = 2;
    //   // Global plugin example: https://www.chartjs.org/docs/latest/developers/plugins.html
    //   ChartJS.plugins.register({
    //     // plugin implementation
    //   });
    //   // New chart type example: https://www.chartjs.org/docs/latest/developers/charts.html
    //   ChartJS.controllers.MyType = ChartJS.DatasetController.extend({
    //     // chart implementation
    //   });
    // };
    // (async() => {
    //     const canvasRenderService = new CanvasRenderService(width, height, chartCallback);
    //     const image = await canvasRenderService.renderToBuffer(configuration);
    //     const dataUrl = await canvasRenderService.renderToDataURL(configuration);
    //     const stream = canvasRenderService.renderToStream(configuration);
    //     debugger
    // })();
    var resulthtml = "";
    resulthtml += "<html>";
    resulthtml +=
      "<head><meta content='text/html; charset=utf-8' http-equiv='Content-Type'>";
    resulthtml += "</head>";
    resulthtml += `<body>${req.body.style}`;
    resulthtml += `<div class="row">
            ${req.body.html}`;
    resulthtml += `</div>`;
    resulthtml += "</body>";
    resulthtml += "<html>";
    conversion({
        html: resulthtml,
        footer: '<div style="text-align:center;float:left;width:100%;margin-top:20px;font-size:12px;">&copy; 2019 Secure Link Services AG. All Rights Reserved.</div>',
        paperSize: {
          width: "12in",
          height: "12in"
        }
      },
      function (err, pdf) {
        let filename = req.body.filename;
        if (!err) {
          var output = fs.createWriteStream(`${globalConfig.storageLocation}${filename}.pdf`);
          console.log(pdf.logs);
          console.log(pdf.numberOfPages);
          // since pdf.stream is a node.js stream you can use it
          // to save the pdf to a file (like in this example) or to
          // respond an http request.
          pdf.stream.pipe(output);
          resolve({
            status: true,
            message: "Pdf generated succesfully",
            filename: filename + ".pdf"
          });
        } else {
          reject({
            status: false,
            message: err
          });
        }
      }
    );
  });
}

/**
 * main handler for updating password and user information
 * @param {} request
 */
function updatePassword(request) {
  return new Promise((resolve, reject) => {
    if (request.body.password) {
      changePassword(request)
        .then(result => {
          if (result.status) {
            resolve({
              status: true,
              message: "info updated succesfully"
            });
          }
        })
        .catch(err => {
          resolve({
            status: false,
            message: err
          });
        });
    } else {
      updatePersInfo(request)
        .then(result => {
          if (result) {
            resolve({
              status: true,
              message: "info updated succesfully"
            });
          }
        })
        .catch(err => {
          resolve({
            status: false,
            message: err
          });
        });
    }
  });
}

/**
 * function for changing password
 */
function changePassword(request) {
  return new Promise((resolve, reject) => {
    tables[origin]["user"].find({
        _id: request.userInfo.userId
      },
      (err, docs) => {
        if (docs) {
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(request.body.password, salt, (err, hash) => {
              request.body.password = hash;
              tables[origin]["user"].updateOne({
                  _id: request.userInfo.userId
                },
                request.body,
                (err, doc) => {
                  if (!err) {
                    if (doc && doc.ok) {
                      resolve({
                        status: true
                      });
                    } else {
                      resolve({
                        status: false
                      });
                    }
                  } else {
                    resolve({
                      status: false
                    });
                  }
                }
              );
            });
          });
        } else {
          resolve({
            status: false
          });
        }
      }
    );
  });
}
/**
 * updating person information
 * @param {*} request
 */
function updatePersInfo(request) {
  return new Promise((resolve, reject) => {
    tables[origin]["person"].updateOne({
        _id: request.body.data["_id"]
      },
      request.body.data,
      (error, docs) => {
        if (!error) {
          if (docs) {
            resolve({
              status: true,
              message: "info updated succesfully"
            });
          } else {
            resolve({
              status: false,
              message: error
            });
          }
        }
      }
    );
  });
}

/**
 * sending mail
 * @param {*} text (string)
 */
function sendMail(request) {
  let mailPayload = new FormData();
  // const mails = ["nms@selise.ch", "raquib.hassan@selise.ch"];
  mailPayload.append('recipient', request.body.recipient);
  mailPayload.append("text", request.body.mailBody);
  mailPayload.append("subject", request.body.subject);
  return new Promise((resolve, reject) => {
    let contentType = mailPayload.getHeaders()["content-type"];
    // if (process.env.NODE_ENV == "production") {
    axios({
        method: "post",
        url: globalConfig.mailServiceUrl,
        data: mailPayload,
        headers: {
          "Content-Type": contentType
        }
      })
      .then(response => {
        if (
          response.data.status.accepted.length &&
          !response.data.status.rejected.length
        ) {
          resolve({
            status: true
          });
        }
      })
      .catch(err => {
        reject(JSON.stringify(err));
      });
    // } else {
    //   resolve({
    //     status: true
    //   });
    // }
  });
}