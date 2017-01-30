# Translate
Google Translate API

[Supported Languages](https://github.com/kurisubrooks/sherlock/blob/master/modules/api/translate/langs.json)

### Endpoint
```
/api/translate
```

### Params
**`to`**: the language code to translate the query to  
**`from`**: the language code to translate from _(optional)_  
**`query`**: the text to translate to/from

### Example Request
##### Request Types: GET / POST
```
https://api.kurisubrooks.com/api/translate?to=ja&query=Hello,%20World!
```
```json
{
    "ok": true,
    "to": {
        "name": "Japanese",
        "local": "日本語",
        "code": "ja"
    },
    "from": {
        "name": "English",
        "local": "English",
        "code": "en"
    },
    "query": "Hello, World!",
    "result": "こんにちは、世界！"
}
```

### Errors
##### Missing Fields
> Returns if a required arg in the URL is missing

```json
{
    "ok": false,
    "error": "missing fields"
}
```

##### Unknown Language
> Returns if an unknown/unsupported language code was found in the to/from field

```json
{
    "ok": false,
    "error": "unknown language in 'to' field"
}
```
```json
{
    "ok": false,
    "error": "unknown language in 'from' field"
}
```

##### Internal Server Error
> Returns if an internal error has occurred in the server process

```json
{
    "ok": false,
    "code": 500,
    "error": "Internal Server Error"
}
```
