xisoDip
.factory('xService', function(xiHttp, dHttp, xisoConfig, $ionicNativeTransitions, $cordovaFile, $cordovaFileTransfer, $timeout, $state){
    var self = this;
    
    // ------------------------------------------------------------------------------------------------
    // 인증 변수
    // ------------------------------------------------------------------------------------------------
    var timeID = null;              // 인증번호를 체크하는 interval
    var timeID2 = null;             // 시퀀스가 들어왔는지 확인하는 interval
    
    self.auth_no = null;            // 인증번호
    self.server_url = null;         // 데이터서버 URL
    self.is_auth = false;           // 인증번호 인증여부

    // ------------------------------------------------------------------------------------------------
    // 파일다운로드 변수
    // ------------------------------------------------------------------------------------------------
    self.is_downloading = false;    // 다운로드 중인지
    self.down_total = 0;            // 총 다운로드 받을 갯수
    self.down_cur = 0;              // 현재 몇번째 다운로드 중인지
    self.progress = 0;              // 다운로드 프로그레스

    self.fileObj = {};              // cordova.file 이 들어감

    var down_time_len = 0;          // 순차 다운로드를 위해 차감할 다운로드할 timeline 중의 남은 갯수 index 역할

    // ------------------------------------------------------------------------------------------------
    // 시퀀스 변수
    // ------------------------------------------------------------------------------------------------

    self.cur_seq = 0;               // 현재 재생할 목록

    self.main_seq = {};             // 플레이 될 시퀀스 정보
    self.main_seq.timelines = [];

    self.temp_seq = {};             // 다운로드 중인 시퀀스 정보
    self.temp_seq.timelines = [];

    self.cur_qr = null;             // qrcode url

    self.time_id1 = null;           // 현재 플레이 되고 있는 이미지 또는 영상의 시간 제어 setTimeout
    self.time_id2 = null;           // 영상이 없을시 루프도는 setTimeout



    // 기기에 저장된 server url 이 있으면 불러온다.
    if(window.localStorage['server_url']) self.server_url = JSON.parse(window.localStorage['server_url']);

    // 기기에 저장된 시퀀스가 있으면 불러온다.
    if(window.localStorage['seq']) {
        self.main_seq = JSON.parse(window.localStorage['seq']);
        console.log('기기에 저장된 시퀀스 읽어옴 - 아래');
        console.log(self.main_seq);
    }

    // 인증번호 및 서버URL 받아오기 : 데이터 서버의 URL 이 들어올때까지 루프
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

                        clearInterval(timeID2);
                        timeID2 = undefined;
                        self.getSeq();
                    }
                }
            }, function (err) {
                console.log(err);
            });

    };

    // 다른 시퀀스가 들어왔는지 체크하여 다른 시퀀스면 다운로드 시킴.
    var checkSeq = function() {

        if(self.is_auth && !self.is_downloading) {
            var deviceInfo = JSON.parse(window.localStorage['device']);

            // 시퀀스 저장
            dHttp.send('player', 'dispGetMainSeq', {uuid: deviceInfo.uuid}).then(function (res) {
                console.log('시퀀스가 들어왔는지 체크중..');
                if (res.data.error == 0) {

                    // 시퀀스가 변경되었는지 체크
                    var device_seq = angular.copy(self.main_seq);
                    var server_seq = res.data.seq;

                    if(device_seq.timelines && server_seq.timeline) {
                        console.log('device_seq and sever_seq is available');

                        // 같은 배열인지 비교후 다르면 다운로드
                        // if(!compare_timeline(device_seq.timelines, server_seq.timeline)) {
                        if(!compare_timeline(device_seq, server_seq)) {
                            console.log('다른 타임라인입니다.');
                            clearInterval(timeID2);
                            timeID2 = undefined;

                            // 파일 다운로드
                            self.setSequence(server_seq, 'm', device_seq.dir);    // Main(dataServer)

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

    self.getAuth = function() {
        checkAuth();
        timeID = setInterval(checkAuth, 10000);
    };

    self.getSeq = function(intv) {
        intv = intv ? intv : 30000;
        timeID2 = setInterval(checkSeq, 30000);  // 30초에 한번씩 시퀀스가 들어왔나 체크
    };

    self.setDeviceInfo = function(device) {
        if(!window.localStorage['device']) window.localStorage['device'] = JSON.stringify(device);
    };

    // 다운로드 성공하면 다음 파일 순차 다운로드 및 완료 처리
    var down = function(timelines, dir, url, device_dir){
        down_time_len--;
        self.down_cur++;

        if(down_time_len > -1){
            var targetPath = self.fileObj.externalDataDirectory + dir + timelines[down_time_len].file;
            // console.log(targetPath);

            var path = url + timelines[down_time_len].uploaded;

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

            self.getSeq();  // 다시 interval 돌림

            self.tempToMain();  // 다운로드 완료되면 시퀀스 덮어씀
        }
    };

    // 다른곳에서 호출하는 다운로드
    self.download = function(timelines, dir, url, device_dir){
        document.addEventListener('deviceready', function () {
            if(timelines.length > 0) {
                self.is_downloading = true;
                
                // self.fileObj = cordova.file;

                down_time_len = timelines.length;
                self.down_total = timelines.length;
                self.down_cur = 0;

                down(timelines, dir, url, device_dir);
            }
        }, false);
    };

    // 디렉토리 삭제
    self.removeDir = function(dir){
        if(!dir || typeof(dir)==='undefined') {
            console.log('이전 dir 이 존재하지 않음');
        }else{
            if(self.temp_seq.dir != dir) {
                console.log('이전 dir 삭제함 = ' + dir);
                $cordovaFile.removeRecursively(self.fileObj.externalDataDirectory, dir).then(function (success) {
                    console.log(success);
                }, function (error) {
                    console.log(error);
                });
            }else{
                console.log('같은 시퀀스 dir 이라 삭제하지 않음');
            }
        }
    };

    self.setCurSeq = function(seq_no, transOpt){
        console.log('state changed : '+ self.cur_seq +' => '+ seq_no);

        clearTimeout(self.time_id1);
        clearTimeout(self.time_id2);

        self.cur_seq = seq_no;

        // transOpt.fixedPixelsTop = 40; // the number of pixels of your fixed header, default 0 (iOS and Android)
        if(self.main_seq.text_clip) {
            transOpt.fixedPixelsBottom = 39; // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
        }

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
            self.download(self.temp_seq.timelines, self.temp_seq.dir, self.server_url, device_dir);
        }else {
            self.download(self.temp_seq.timelines, self.temp_seq.dir, xisoConfig.url);
        }
    };

    // temp_seq 가 모두 다운로드 되면 main_seq 를 덮어쓰고 플레이 시킴
    self.tempToMain = function(){
        self.main_seq = angular.copy(self.temp_seq);    // 기존 시퀀스를 새 시퀀스로 대체한다.
        console.log('temp 2 main --- 아래는 덮어씌워진 main seq');
        console.log(self.main_seq);
        window.localStorage['seq'] = JSON.stringify(self.main_seq); // 기기에 대체된 시퀀스를 저장한다.
        
        self.temp_seq = {};
        self.temp_seq.timelines = [];

        clearTimeout(self.time_id1);
        clearTimeout(self.time_id2);

        self.cur_seq = 0;

        if ($state.current.name == 'player.demo') {
            $ionicNativeTransitions.stateGo('player.demo2', {cur_clip: self.cur_seq}, {}, {"type":"fade"});
        } else {
            $ionicNativeTransitions.stateGo('player.demo', {cur_clip: self.cur_seq}, {}, {"type":"fade"});
        }
    };
    
    return self;
})

.factory('Toast', function($cordovaToast){
    return function(text) {
        $cordovaToast.showShortBottom(text);
    }
})

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
});