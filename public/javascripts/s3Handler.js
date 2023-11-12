const AWS = require("aws-sdk");
require("dotenv").config();

// Configure AWS SDK (replace with your own credentials from the AWS console)
// These credentials expire after approx 6 hours, so you will need to refresh them
// It is recommended to put these credentials in an env file and use process.env to retrieve them
// On EC2, you can assign the ec2SSMCab432 IAM role to the instance and the SDK will automatically retrieve the credentials. This will also work from inside a Docker container.
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

// Create an S3 client
const s3 = new AWS.S3();

// Specify the S3 bucket and object key
const bucketName = "navigatex-bucket";
const objectKey = "text.json";

// JSON data to be written to S3
const jsonData = {
  pageCount: 0,
};

async function createS3bucket() {
  try {
    await s3.createBucket( { Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch(err) {
    if (err.statusCode === 409) {
      console.log(`Bucket already exists: ${bucketName}`);
    } else {
      console.log(`Error creating bucket: ${err}`);
    }
  }
}

// Upload the JSON data to S3
async function uploadJsonToS3(newData) {
    const params = {
      Bucket: bucketName,
      Key: objectKey,
      Body: JSON.stringify(newData),
      ContentType: "application/json",
    };
    try {
      await s3.putObject(params).promise();
      console.log("JSON file uploaded successfully.");
    } catch (err) {
      console.error("Error uploading JSON file:", err);
    }
  }

// Retrieve the object from S3
async function getObjectFromS3() {
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };
    try {
      const data = await s3.getObject(params).promise();
      const parsedData = JSON.parse(data.Body.toString("utf-8"));
      return parsedData; // return the data
    } catch (err) {
      console.error("Error:", err);
      return null;
    }
  }

module.exports = { uploadJsonToS3, getObjectFromS3 };

// Call the upload and get functions
(async () => {
    await createS3bucket();
    const existingData = await getObjectFromS3();
    
    if (existingData === null) {
      // Only upload initial data if no existing data is found
      await uploadJsonToS3({ pageCount: 0 });
    }
    
    await getObjectFromS3();
  })();
  
