(() => {
    "use strict";
    var expiredTokens = [];

    module.exports = {
        storeExpiredToken: StoreExpiredTOken,
        checkExpiredToken: checkExpiredToken
    }

    function StoreExpiredTOken(token) {
        expiredTokens.push(token);
    }

    function checkExpiredToken(token) {
        let isExpired = expiredTokens.includes(token);
        return isExpired;
    }
})();