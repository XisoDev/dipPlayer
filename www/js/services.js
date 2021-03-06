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

    .factory('Auth', function(xiHttp, dHttp, $interval, $state, Sequence, $rootScope) {
        var self = this;

        var timeID = null;
        var timeID2 = null;

        self.auth_no = null;
        self.server_url = null;
        self.is_auth = false;

        $rootScope.sequence = Sequence;

        if(window.localStorage['server_url']) self.server_url = JSON.parse(window.localStorage['server_url']);

        // 같은 타임라인인지 비교
        var compare_timeline = function(a, b){
            var result = true;
            
            if(a.length != b.length) return false;
            
            for(i =0 ; i < a.length ; i++){
                if(a[i].sid != b[i].sid){
                    console.log('a['+i+'].sid != b['+i+'].sid');
                    console.log(a[i].sid +' != '+ b[i].sid);
                    result = false;
                    return false;
                }
            }
            
            return result;
        };

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

                        // console.log('아래는 현재 main_seq');
                        // console.log($rootScope.sequence.main_seq);

                        // 시퀀스가 변경되었는지 체크
                        var device_seq = angular.copy($rootScope.sequence.main_seq);
                        var server_seq = res.data.seq;

                        if(device_seq.timelines && server_seq.timeline) {
                            console.log('device_seq and sever_seq is available');

                            // 같은 배열인지 비교후 다르면 다운로드
                            if(!compare_timeline(device_seq.timelines, server_seq.timeline)) {
                                console.log('다른 타임라인입니다.');
                                clearInterval(timeID2);

                                // 파일 다운로드
                                $rootScope.sequence.setSequence(server_seq, 'm', device_seq.dir);    // Main(dataServer)

                                // xiFile.download($rootScope.sequence.temp_seq.timelines, $rootScope.sequence.temp_seq.dir, self.server_url, device_seq.dir);

                                // self.getSeq(60000); // 60초 간격으로 바꿈
                            }else{
                                console.log('같은 타임라인입니다.');
                            }
                        }
                    } else {
                        console.log(res.data.message);
                    }
                }, function (err) {
                    console.log(err);
                });
            }
        };

        self.getSeq = function(intv) {
            intv = intv ? intv : 30000;
            timeID2 = setInterval(checkSeq, 30000);  // 30초에 한번씩 시퀀스가 들어왔나 체크
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

    .factory('xiFile',function($timeout, $ionicPlatform, $cordovaFileTransfer, Sequence, Auth){
        var self = this;

        self.is_downloading = false;
        self.total = 0;
        self.cur = 0;
        self.progress = 0;

        var fileObj = {};
        var time_len = 0;

        var down = function(timelines, dir, url, device_dir){
            time_len--;
            self.cur++;

            if(time_len > -1){
                var targetPath = fileObj.externalDataDirectory + dir + timelines[time_len].file;
                console.log(targetPath);

                var path = url + timelines[time_len].uploaded;

                $cordovaFileTransfer.download(path, targetPath, {}, true).then(function(res){
                    console.log(res);

                    down(timelines, dir, url, device_dir);
                },function(err){
                    console.log(err);
                }, function (progress) {
                    $timeout(function () {
                        self.progress = Math.floor((progress.loaded / progress.total) * 100);
                    });
                });
            }else{
                self.is_downloading = false;
                console.log('파일 다운로드 완료');

                self.removeDir(device_dir);
                
                Auth.getSeq();  // 다시 interval 돌림

                Sequence.tempToMain();  // 다운로드 완료되면 시퀀스 덮어씀
            }
        };

        self.removeDir = function(dir){
            if(!dir || typeof(dir)==='undefined') {
                console.log('이전 dir 이 존재하지 않음');
            }else{
                console.log('이전 dir 삭제함 = ' + dir);
            }
        };

        self.download = function(timelines, dir, url, device_dir){

            document.addEventListener('deviceready', function () {
                if(timelines.length > 0) {
                    self.is_downloading = true;
                    // console.log(cordova.file);
                    fileObj = cordova.file;

                    time_len = timelines.length;
                    self.total = timelines.length;
                    self.cur = 0;

                    down(timelines, dir, url, device_dir);
                    // var targetPath = cordova.file.dataDirectory + "galaxy.mp4";
                }
            }, false);

            /*if(timelines.length > 0) {
                $ionicPlatform.ready(function() {

                    // console.log(cordova.file);

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
            }*/

        };

        return self;
    })

    .factory('Toast', function($cordovaToast){
        return function(text) {
            $cordovaToast.showShortBottom(text);
        }
    })

    .factory('Sequence', function($state, $ionicNativeTransitions, xiFile, xisoConfig){
        var self = this;

        self.cur_seq = 0;   //현재 재생할 목록

        self.main_seq = {};             // 플레이 될 시퀀스 정보
        self.main_seq.timelines = [];

        self.temp_seq = {};             // 다운로드 중인 시퀀스 정보
        self.temp_seq.timelines = [];

        self.cur_qr = null; //qrcode url

        self.time_id1 = null;
        self.time_id2 = null;

        // self.clip_info = {};

        if(window.localStorage['seq']) {
            self.main_seq = JSON.parse(window.localStorage['seq']);
            console.log('기기에 저장된 시퀀스 읽어옴 - 아래');
            console.log(self.main_seq);
        }

        self.setCurSeq = function(seq_no, transOpt){
            console.log('state changed : '+ self.cur_seq +' => '+ seq_no);

            clearTimeout(self.time_id1);
            clearTimeout(self.time_id2);

            self.cur_seq = seq_no;

            // transOpt.fixedPixelsTop = 40; // the number of pixels of your fixed header, default 0 (iOS and Android)
            transOpt.fixedPixelsBottom = 39; // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)

            console.log('$state.current.name = '+$state.current.name);
            if ($state.current.name == 'player.demo') {
                $ionicNativeTransitions.stateGo('player.demo2', {cur_clip: self.cur_seq}, {}, transOpt);
            } else {
                $ionicNativeTransitions.stateGo('player.demo', {cur_clip: self.cur_seq}, {}, transOpt);
            }
        };

        self.setSequence = function(seq, prefix, device_dir){
            self.temp_seq = {};
            self.temp_seq.timelines = [];
            self.temp_seq.text_clip = seq.text_clip;
            self.temp_seq.dir = prefix + seq.seq_srl;    // 메인서버의 시퀀스와 데이터서버의 시퀀스가 같을 수 있으므로
            self.temp_seq.play_type = prefix;   // Demo : d, Main(dataServer) : m

            for(var key in seq.timeline){
                self.temp_seq.timelines[key] = {
                    limit : seq.timeline[key].duration,
                    file : seq.timeline[key].uploaded_filename.substr(seq.timeline[key].uploaded_filename.lastIndexOf('/')),
                    uploaded : seq.timeline[key].uploaded_filename.substr(2),
                    transition : seq.timeline[key].transition,
                    file_type : seq.timeline[key].file_type,
                    file_srl : seq.timeline[key].file_srl,
                    url : seq.timeline[key].url,
                    is_show_qr : seq.timeline[key].is_show_qr,
                    sid : seq.timeline[key].sid
                };
            }

            if(prefix == 'm') {
                xiFile.download(self.temp_seq.timelines, self.temp_seq.dir, self.server_url, device_dir);
            }else {
                xiFile.download(self.temp_seq.timelines, self.temp_seq.dir, xisoConfig.url);
            }
        };

        // temp_seq 가 모두 다운로드 되면 main_seq 를 덮어쓰고 플레이 시킴
        self.tempToMain = function(){
            self.main_seq = angular.copy(self.temp_seq);
            console.log('temp 2 main --- 아래는 덮어씌워진 main seq');
            console.log(self.main_seq);
            window.localStorage['seq'] = JSON.stringify(self.main_seq);

            // TODO 기존 시퀀스 파일 제거부분도 추가 되어야함
            self.temp_seq = {};
            self.temp_seq.timelines = [];

            clearTimeout(self.time_id1);
            clearTimeout(self.time_id2);

            self.cur_seq = 0;
            // $state.go('player.demo', {cur_clip: 0});   // 데모 플레이어로 이동시킴

            if ($state.current.name == 'player.demo') {
                $ionicNativeTransitions.stateGo('player.demo2', {cur_clip: self.cur_seq}, {}, {"type":"fade"});
            } else {
                $ionicNativeTransitions.stateGo('player.demo', {cur_clip: self.cur_seq}, {}, {"type":"fade"});
            }
        };

        return self;
    });
