## Sample ReST service

### Description

This is just an exercise showing what is like to work with the most fashionable web server
framework of the day, [fastify](https://www.fastify.io/), while enjoying the code linearization 
brought by **`async-await`**.

It merely manages a hypothetical _`Phone`_ resource, described by a handful of properties:
- `serialNo`: a serial number of the device, almost qualifiable for a proper ID
- `color` and `type`: self-explanatory properties, both have a discrete range of possible 
values
- `metadata`: arbitrary dictionary of unregulated properties

The service API consists in five simple endpoints, to which the usual ReST conventions 
apply:

    POST /phone
    {Phone to be created, without ID}


    GET /phone/{id}

    PUT /phone/{id}
    {Updated Phone, without ID}

    DELETE /phone/{id}

    GET /phone?batch={internal_cursor}&size={hint_for_batch_size}

---
### Implementation

Phone data get saved into a Redis database, in a hash key whose internal keys are the phone 
entity IDs and internal values are V8-serialized form of JS objects representing the 
entities. Each ID is a cryptographically and URL safe string, generated upon insertion 
into the database.

The service is intended to be employed behind a reverse proxy, so no attention has been 
payed to security considerations like connection encryption, trusted proxies, CORS 
etc. Moreover, there's currently no authentication and authorization mechanism in place.
 
#### Note on entity listing

Using a non-relational database was a performance-oriented choice justified by the lack 
of multiple entities within the system. However, listing the stored phone entities comes 
with a certain price:
* no filtering on property values can be made at database level (but it could be implemented 
in application code)
* scanning the contents of a Redis hash key in pages, while necessary in order to avoid a
system failure for high loads, is not an exact procedure with respect to 
the batch size

The first request should not use a batch identifier. Each response contains a list of 
_`Phone`_ entities and the identifier of the next batch, which shoud be used for subsequent 
requests. When no such batch identifier is returned, the scanning is complete.   
 
---
### Running

After executing

    npm install --production

in the current folder and at the very least configuring the database connection parameters within the 
`src/config.json` file, you can start the HTTP service by running

    node .

Mind that you can also alter the host and port that the service listens on, as well other configuration
parameters.
