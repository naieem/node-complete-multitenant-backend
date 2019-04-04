# Global core service with build in authentication facility

Basic Authentication is buildin included with this service.

## Business logics

To include business logics just clone this repo and then add you business logics by adding your services 

## Endpoints

### '/register'

for registering new user

### '/login'

for login in the user

### '/getLoggedinUserInfo'

confirms loggedin users information

### '/insert'
### Payload
`
{
    table:string,
    data:object
}
`

### '/getByQuery'
### Payload
`
{
	"table":string,
	"query":object,
	"fields":[string]
}
`
### '/addrelation'
### Payload
`
{
	"_id":"6463969c-439d-4699-b352-192b359745",
	"parentTableName":"product",
	"childTableName":"comment",
	"parentTableId":"5c49f9c021532ulala",
	"childTableId":"ff562adc-848a-482d-b08b-c575c765f515"
}`

### '/getrelation'
### Payload
`
{
	"parentTableName":"product",
	"childTableName":"comment",
	"parentTableId":"5c49f9c021532ulala"
}`

### '/uploadFile'
### Payload
`
file:FileObject
`

### '/getFile'
### Payload
`
fileId:'ff562adc-848a-482d-b08b-c575c765f515'
`