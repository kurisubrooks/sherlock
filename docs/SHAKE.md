# Shake
Earthquake Image Generation API

### Path
```
/api/shake
```

### Params
**`data`**: base64 encoded json object

### Data
```js
{
    "l": [34.3, 141.9],
    "e": 472,
    "m": 5,
    "s": "2",
    "d": 10
}
```

**`l`**: epicenter location in [lat, long] format (array)  
**`e`**: epicenter id (int)  
**`m`**: magnitude (int)  
**`s`**: seismic intensity (string)  
**`d`**: depth (int)  
**`p`**: epicenter id
