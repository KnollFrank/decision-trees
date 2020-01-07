'use strict';

class Cache {

    constructor() {
        this.cache = {};
    }

    get(key, computeValue) {
        // FK-TODO: vergleich mit einem Array als key sollte eigentlich nicht funktionieren. Anders prüfen mit compareFlatArrays().
        if (!this.containsKey(key)) {
            this._cacheValueForKey({ key, value: computeValue() });
        }
        return this._getValueForKey(key);
    }

    containsKey(key) {
        return this.cache.hasOwnProperty(key);
    }

    cacheValuesForKeys({ keys, values }) {
        zip(keys, values).forEach(([key, value]) => this._cacheValueForKey({ key, value }));
    }

    _cacheValueForKey({ key, value }) {
        this.cache[key] = value;
    }

    getValuesForKeys({ keys }) {
        return keys.map(key => this._getValueForKey(key));
    }

    _getValueForKey(key) {
        return this.cache[key];
    }
}