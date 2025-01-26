# About the project

This is a simple aws setup. We have 4 resources in the stack

- `Dynamo Db Table` It stores the users information
- `S3 Bucket` It stores the users profile images uploaded
- `Api gateway` A simple http api gateway with 2 routes, 1 which registers new users, and the other for getting a particular users information
- `Lambda` It receives events from our api gateway and accurately responds to those events
