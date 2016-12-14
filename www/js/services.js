/**
 * Created by overcode on 2016. 12. 12..
 */
xisoDip

    .factory('xiHttp', function($http, xisoConfig){
        var service = {};

        var baseUrl = xisoConfig.url;
        var _finalUrl = '';

        service.send = function(module, act, params){

            if(act.indexOf('disp') == 0){
                _finalUrl = baseUrl + '/disp.php?module=' + module + '&act=' + act;
            }else{
                _finalUrl = baseUrl + '/proc.php?module=' + module + '&act=' + act;
            }

            return $http({
                method: 'POST',
                url: _finalUrl,
                data: params
            });
        };

        return service;
    })

    .factory('Auth', function(xiHttp) {
        var self = this;

        self.auth_no = null;


        var checkAuth = function(){
            var deviceInfo = JSON.parse(window.localStorage['device']);

            var params = {};
            params.uuid = deviceInfo.uuid;
            params.model = deviceInfo.model;
            if (deviceInfo.serial) params.serial = deviceInfo.serial;
            params.version = deviceInfo.version;

            xiHttp.send('player', 'procCheckPlayer', params)
                .then(function (res) {
                    if(res.data.error == 0) {
                        console.log('getted auth no : '+res.data.result.auth_no);
                        self.auth_no = res.data.result.auth_no;
                    }
                }, function (err) {
                    console.log(err);
                });
        };

        self.getAuth = function() {
            checkAuth();
            var timeID = setInterval(checkAuth, 10000);
        };

        self.setDeviceInfo = function(device) {
            if(!window.localStorage['device']) window.localStorage['device'] = JSON.stringify(device);
        };

        self.isAuthenticated = function() {
            return false;
        };

        return self;
    });
