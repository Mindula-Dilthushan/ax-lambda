/**
 *
 * project name     : ax-lambda
 * project author   : mindula dilthushan
 * author email     : minduladilthushan1@gmail.com
 *
 */

// import AWS from 'aws-sdk';

const AWS = require('aws-sdk');
const dotEnv = require('dotenv');
const {USER, USERS} = require("./api/ax.api");

//dot env config
dotEnv.config();

const env = process.env;

//configuration
AWS.config.update({
    region: 'us-west-1'
});

//dynamodb client
const doClient = new AWS.DynamoDB.DocumentClient();
const dbTableAx = `${env.TABLE_NAME}`

//routes
const userPath = `${USER}`;
const usersPath = `${USERS}`;

//handler
exports.handler = async function (event) {
    console.log('Request event  => ', event);

    let response;

    switch (true) {

        case event.httpMethod === 'GET' && event.path === userPath:
            response = await getUser(event.queryStringParameters.id);
            break;
        case event.httpMethod === 'GET' && event.path === usersPath:
            response = await getUsers();
            break;
        case event.httpMethod === 'POST' && event.path === userPath:
            response = await saveUser(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === userPath:
            const requestBody = JSON.parse(event.body);
            response = await updateUser(requestBody.id, requestBody.updateKey, requestBody.updateValue);
            break;
        case event.httpMethod === 'DELETE' && event.path === userPath:
            response = await deleteUser(JSON.parse(event.body).id);
            break;
        default:
            response = axResponse(404, '404 Not Found');
    }
    return response;

}

//search user
async function getUser(id) {
    const params = {
        TableName: dbTableAx,
        Key: {
            'id': id
        }
    }
    return await doClient.get(params).promise().then((response) => {
        return axResponse(200, response.Item);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    });
}

//search all users
async function getUsers() {
    const params = {
        TableName: dbTableAx
    }
    const allUsers = await scanDbRecords(params, []);
    const body = {
        users: allUsers
    }
    return axResponse(200, body);
}

//check users in db records
async function scanDbRecords(scanParams, itemArray) {
    try {
        const scanData = await doClient.scan(scanParams).promise();
        itemArray = itemArray.concat(scanData.Items);
        if (scanData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = scanData.LastEvaluatedKey;
            return await scanDbRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    }
}

//save user
async function saveUser(requestBody) {
    const params = {
        TableName: dbTableAx,
        Item: requestBody
    }
    return await doClient.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'USER SAVE SUCCESS!',
            Item: requestBody
        }
        return axResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

//update user
async function updateUser(id, updateKey, updateValue) {
    const params = {
        TableName: dbTableAx,
        Key: {
            'id': id
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await doClient.update(params).promise().then((response) => {
        const body = {
            Operation: 'UPDATE',
            Message: 'SUCCESS',
            UpdatedAttributes: response
        }
        return axResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

//delete user
async function deleteUser(id) {
    const params = {
        TableName: dbTableAx,
        Key: {
            'id': id
        },
        ReturnValues: 'ALL_OLD'
    }
    return await doClient.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'USER DELETE SUCCESS!',
            Item: response
        }
        return axResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

//response handling
function axResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
}

