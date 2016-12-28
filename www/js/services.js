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

    .factory('dHttp', function($http){
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

    .factory('Auth', function(xiHttp, dHttp, $interval, $state, Sequence, xiFile, $rootScope) {
        var self = this;

        var timeID = null;
        var timeID2 = null;

        self.auth_no = null;
        self.server_url = null;
        self.is_auth = false;

        $rootScope.sequence = Sequence;

        var checkAuth = function(){
            var deviceInfo = JSON.parse(window.localStorage['device']);

            var params = {
                uuid : deviceInfo.uuid,
                model : deviceInfo.model,
                version : deviceInfo.version
            };
            if (deviceInfo.serial) params.serial = deviceInfo.serial;

            xiHttp.send('player', 'procCheckPlayer', params)
                .then(function (res) {
                    // console.log(res);
                    if (res.data.error == 0) {
                        console.log('got auth no : '+res.data.result.auth_no);
                        self.auth_no = res.data.result.auth_no;

                        // admin uuid 가 유효하면 - server url 유무로 체크
                        if (res.data.result.server_url) {
                            console.log(res.data.result.server_url);
                            self.server_url = res.data.result.server_url;

                            if(window.localStorage['server_url']) {
                                var tempUrl = JSON.parse(window.localStorage['server_url']);
                                if (tempUrl != self.server_url) {
                                    window.localStorage['server_url'] = JSON.stringify(res.data.result.server_url);
                                }
                            }else{
                                window.localStorage['server_url'] = JSON.stringify(res.data.result.server_url);
                            }

                            clearInterval(timeID);
                            timeID = undefined;

                            self.is_auth = true;

                            self.getSeq();
                        }
                    }
                }, function (err) {
                    console.log(err);
                });

        };
        
        var checkSeq = function() {

            if(self.isAuthenticated()) {
                var deviceInfo = JSON.parse(window.localStorage['device']);

                // 시퀀스 저장
                dHttp.send('player', 'dispGetMainSeq', {uuid: deviceInfo.uuid}).then(function (res) {
                    console.log('시퀀스가 들어왔는지 체크중..');
                    if (res.data.error == 0) {
                        console.log(res.data.message);
                        // TODO 여기서 시퀀스가 변경되었는지 체크해봐라
                        // console.log('아래는 현재 main_seq');
                        // console.log($rootScope.sequence.main_seq);

                        var cur_dir = $rootScope.sequence.main_seq.dir;
                        var down_dir = 'd' + res.data.seq.seq_srl;
                        console.log('cur dir : '+ cur_dir + ', download dir : ' + down_dir);
                        if(cur_dir != down_dir) {
                            // 파일 다운로드
                            $rootScope.sequence.setSequence(res.data.seq, 'd');    // d : data_sever

                            xiFile.download($rootScope.sequence.temp_seq.timelines, $rootScope.sequence.temp_seq.dir, self.server_url);
                        }
                    } else {
                        console.log(res.data.message);
                    }
                }, function (err) {
                    console.log(err);
                });
            }
        };

        self.getSeq = function() {
            timeID2 = setInterval(checkSeq, 20000);  // 30초에 한번씩 시퀀스가 들어왔나 체크
        };

        self.getAuth = function() {
            checkAuth();
            timeID = setInterval(checkAuth, 10000);

            // self.getSeq();
        };

        self.setDeviceInfo = function(device) {
            if(!window.localStorage['device']) window.localStorage['device'] = JSON.stringify(device);
        };

        self.isAuthenticated = function() {
            return self.is_auth;
        };

        return self;
    })

    .factory('xiFile',function($timeout, $ionicPlatform, $cordovaFileTransfer, $q, Sequence, $ionicLoading){
        var self = this;

        self.download = function(timelines, dir, url){

            if(timelines.length > 0) {
                $ionicPlatform.ready(function() {

                    $ionicLoading.show({
                        template: 'File Downloading...',
                        duration: 30000
                    });

                    var promises = [];

                    timelines.forEach(function (data, index) {

                        var targetPath = cordova.file.externalDataDirectory + dir + data.file;
                        var path = url + data.uploaded;
                        // console.log('download target path : [' + index + '] ' + targetPath);
                        promises.push($cordovaFileTransfer.download(path, targetPath, {}, true));
                    });

                    $q.all(promises).then(function (res) {
                        // console.log(res);
                        for (var i = 0; i < res.length; i++) {
                            console.log(res[i].nativeURL);
                        }

                        $ionicLoading.hide();

                        Sequence.tempToMain();  // 다운로드 완료되면 시퀀스 덮어씀

                    }, function (err) {
                        console.log(err);
                        $ionicLoading.hide();
                    });
                });
            }

        };

        return self;
    })

    .factory('Toast', function($cordovaToast){
        return function(text) {
            $cordovaToast.showShortBottom(text);
        }
    })

    .factory('Sequence', function($state, $ionicNativeTransitions){
        var self = this;
        
        self.cur_seq = 0;   //현재 재생할 목록

        self.main_seq = {};             // 플레이 될 시퀀스 정보
        self.main_seq.timelines = [];

        self.temp_seq = {};             // 다운로드 중인 시퀀스 정보
        self.temp_seq.timelines = [];

        if(window.localStorage['seq']) {
            self.main_seq = JSON.parse(window.localStorage['seq']);
            console.log('기기에 저장된 시퀀스 읽어옴 - 아래');
            console.log(self.main_seq);
        }

        self.setCurSeq = function(seq_no, transOpt){
            console.log('state changed : '+ self.cur_seq +' => '+ seq_no);

            self.cur_seq = seq_no;
            console.log('$state.current.name = '+$state.current.name);
            if ($state.current.name == 'player.demo') {
                $ionicNativeTransitions.stateGo('player.demo2', {cur_clip: self.cur_seq}, {}, transOpt);
            } else {
                $ionicNativeTransitions.stateGo('player.demo', {cur_clip: self.cur_seq}, {}, transOpt);
            }
        };

        self.setSequence = function(seq, prefix){
            self.temp_seq = {};
            self.temp_seq.timelines = [];
            self.temp_seq.text_clip = seq.text_clip;
            self.temp_seq.dir = prefix + seq.seq_srl;    // 메인서버의 시퀀스와 데이터서버의 시퀀스가 같을 수 있으므로
            self.temp_seq.play_type = prefix;   // Demo : D, Main : M

            for(var key in seq.timeline){
                self.temp_seq.timelines[key] = {
                    limit : seq.timeline[key].duration,
                    file : seq.timeline[key].uploaded_filename.substr(seq.timeline[key].uploaded_filename.lastIndexOf('/')),
                    uploaded : seq.timeline[key].uploaded_filename.substr(2),
                    transition : seq.timeline[key].transition,
                    file_type : seq.timeline[key].file_type
                };
            }
        };
        
        // temp_seq 가 모두 다운로드 되면 main_seq 를 덮어쓰고 플레이 시킴
        self.tempToMain = function(){
            self.main_seq = angular.copy(self.temp_seq);
            
            // TODO 기존 시퀀스 파일 제거부분도 추가 되어야함
            self.temp_seq = {};
            self.temp_seq.timelines = [];
            
            window.localStorage['seq'] = JSON.stringify(self.main_seq);

            self.cur_seq = 0;
            $state.go('player.demo', {cur_clip: 0});   // 데모 플레이어로 이동시킴
        };

        return self;
    });
