/**
 * Created by overcode on 2016. 12. 12..
 */
xisoDip
    .factory('xiHttp', function($http, xisoConfig){
        var self = this;

        var baseUrl = xisoConfig.url;
        var _finalUrl = '';

        self.send = function(module, act, params){

            if(act.indexOf('disp') == 0){
                _finalUrl = baseUrl + 'disp.php?module=' + module + '&act=' + act;
            }else{
                _finalUrl = baseUrl + 'proc.php?module=' + module + '&act=' + act;
            }

            return $http({
                method: 'POST',
                url: _finalUrl,
                data: params
            });
        };

        return self;
    })

    .factory('dHttp', function(){
        var self = this;

        self.send = function(module, act, params) {
            if(!window.localStorage['server_url']) return;

            var baseUrl = JSON.parse(window.localStorage['server_url']);
            var _finalUrl = '';

            if(act.indexOf('disp') == 0){
                _finalUrl = baseUrl + 'disp.php?module=' + module + '&act=' + act;
            }else{
                _finalUrl = baseUrl + 'proc.php?module=' + module + '&act=' + act;
            }

            return $http({
                method: 'POST',
                url: _finalUrl,
                data: params
            });
        };

        return self;
    })

    .factory('Auth', function(xiHttp) {
        var self = this;

        var timeID = null;

        self.auth_no = null;
        self.server_url = null;

        var checkAuth = function(){
            var deviceInfo = JSON.parse(window.localStorage['device']);

            var params = {};
            params.uuid = deviceInfo.uuid;
            params.model = deviceInfo.model;
            if (deviceInfo.serial) params.serial = deviceInfo.serial;
            params.version = deviceInfo.version;

            xiHttp.send('player', 'procCheckPlayer', params)
                .then(function (res) {
                    // console.log(res);
                    if(res.data.error == 0) {
                        console.log('getted auth no : '+res.data.result.auth_no);
                        self.auth_no = res.data.result.auth_no;

                        // admin uuid 가 유효하면
                        if(res.data.result.server_url) {
                            // console.log(res.data.result.server_url);
                            self.server_url = res.data.result.server_url;
                            if(JSON.parse(window.localStorage['server_url']) != self.server_url) {
                                window.localStorage['server_url'] = JSON.stringify(res.data.result.server_url);
                            }

                            clearInterval(timeID);
                        }
                    }
                }, function (err) {
                    console.log(err);
                });
        };

        self.getAuth = function() {
            checkAuth();
            timeID = setInterval(checkAuth, 10000);
        };

        self.setDeviceInfo = function(device) {
            if(!window.localStorage['device']) window.localStorage['device'] = JSON.stringify(device);
        };

        self.isAuthenticated = function() {
            return false;
        };

        return self;
    })

    .factory('xiFile',function($timeout, $ionicPlatform, $cordovaFileTransfer, $q){
        var self = this;

        self.downloadProgress = null;

        self.download = function(timelines, dir, url){

            console.log(timelines);


            var promises = [];

            timelines.forEach(function(data, index) {
                var targetPath = cordova.file.externalDataDirectory + dir + data.file;
                var path = url + data.uploaded;

                promises.push($cordovaFileTransfer.download(path, targetPath, {}, true));
            });

            $q.all(promises).then(function(res){
                console.log(res);
                for(var i=0; i<res.length; i++) {
                    console.log(res[i].nativeURL);
                }
            }, function(err){ console.log(err); });
        };

        return self;
    })

    .factory('Toast', function($cordovaToast){
        return function(text) {
            $cordovaToast.showShortBottom(text);
        }
    })

    .factory('Sequence', function(){
        var self = this;

        self.timelines = [];
        self.text_clip = '';
        self.dir = '';

        if(window.localStorage['seq']) {
            var seq = JSON.parse(window.localStorage['seq']);
            self.timelines = seq.timelines;
            self.text_clip = seq.text_clip;
            self.dir = seq.dir;
        }

        self.setSequence = function(seq, prefix){
            self.timelines = [];
            self.text_clip = seq.text_clip;
            self.dir = prefix + seq.seq_srl;

            for(var key in seq.timeline){
                var type = 'I';

                if(seq.timeline[key].file_type.indexOf('video') == 0) type = 'M';

                self.timelines[key] = {
                    type : type,
                    limit : seq.timeline[key].duration,
                    file : seq.timeline[key].uploaded_filename.substr(seq.timeline[key].uploaded_filename.lastIndexOf('/')),
                    uploaded : seq.timeline[key].uploaded_filename.substr(2),
                    transition : seq.timeline[key].transition,
                    file_type : seq.timeline[key].file_type
                };
            }

            var obj = {
                timelines : self.timelines,
                text_clip : self.text_clip,
                dir : self.dir
            };

            // console.log(obj);

            window.localStorage['seq'] = JSON.stringify(obj);
        };

        return self;
    });
