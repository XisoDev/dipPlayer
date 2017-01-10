/**
 * Created by overcode on 2016. 12. 12..
 */
xisoDip

    .controller('playerCtrl', function($scope, Sequence, Auth, xiFile){
        $scope.sequence = Sequence;
        $scope.auth = Auth;
        $scope.xiFile = xiFile;

        $scope.goUrl = function(){
            window.open($scope.sequence.cur_qr, '_system');
        };
    })

    .controller('tempCtrl', function($scope, $state, $stateParams, xiFile, xiHttp, Toast, Sequence, xisoConfig, $ionicPlatform, $ionicNativeTransitions){
        $scope.xiFile = xiFile;
        $scope.sequence = Sequence;

        // 메인서버에서 시퀀스를 구해온다
        $scope.getDemo = function () {
            xiHttp.send('seq', 'dispGetDemoSeq').then(function (res) {
                console.log(res);
                if (res.data.error == 0) {
                    $scope.sequence.setSequence(res.data.seq, 'd');    // d : demo server

                    $scope.xiFile.download($scope.sequence.temp_seq.timelines, $scope.sequence.temp_seq.dir, xisoConfig.url);
                } else {
                    Toast(res.data.message);
                }
            }, function (res) {
                console.log(res);
            });
        };

        // 단말기에 저장된 시퀀스가 있으면
        if ($scope.sequence.main_seq.timelines.length > 0) {
            $ionicPlatform.ready(function() {
                // $state.go('player.demo', {cur_clip: 0}); // 플레이 시킨다
                $scope.sequence.cur_seq = 0;
                $ionicNativeTransitions.stateGo('player.demo2', {cur_clip: 0}, {}, {"type":"fade"});
            });
        } else { // 없으면 받아옴
            $scope.getDemo();
        }
    })

    .controller('demoCtrl', function($scope, $state, $stateParams, xiFile, xiHttp, dHttp, Toast, Sequence, $ionicNativeTransitions){
        $scope.xiFile = xiFile;
        $scope.sequence = Sequence;
        $scope.clip_info = {};

        $scope.play_image = false;
        $scope.play_video = false;

        var next_clip = 0;
        var transOpt = {};

        // $scope.$on('$stateChangeSuccess', function () {
        $scope.$on('$ionicView.enter', function(e) {
            $scope.play_image = true;
            $scope.play_video = true;
            // console.log('state changed : ' + $stateParams.cur_clip);
            // if(cordova.file.externalDataDirectory == null) console.log('널이다');
            // else  console.log('널이 아니다');
            $scope.clip_info = {};
            $scope.sequence = Sequence;

            clearTimeout($scope.sequence.time_id1);
            clearTimeout($scope.sequence.time_id2);

            if($scope.sequence.main_seq.timelines.length > 0 && cordova.file.externalDataDirectory != null) {
                var index = $stateParams.cur_clip ? $stateParams.cur_clip : 0;

                // $scope.sequence.play(index);

                var main_seq = angular.copy($scope.sequence.main_seq);
                var len = main_seq.timelines.length;
                var cur_clip = main_seq.timelines[index];

                var temp = {};  //다음에 재생할 클립의 정보를 담음
                // var next_clip = 0;
                next_clip = 0;

                // 마지막 재생클립이 아니면
                if (len > (Number(index) + 1)) {
                    next_clip = Number(index) + 1;
                    temp = main_seq.timelines[next_clip];  // 다음 클립에 대한 정보를 저장. 전환 효과 때문

                }
                // 마지막 재생클립이면
                else {
                    temp = main_seq.timelines[0];  // 처음 클립에 대한 정보를 저장. 전환 효과 때문
                }

                // 현재 플레이 되는 클립의 정보
                $scope.clip_info = {
                    file_type: cur_clip.file_type,
                    content: cordova.file.externalDataDirectory + main_seq.dir + cur_clip.file
                };

                // console.log(cur_clip);

                if(cur_clip.is_show_qr == 'Y' && cur_clip.url){
                    $scope.sequence.cur_qr = cur_clip.url;
                }else{
                    $scope.sequence.cur_qr = null;
                }

                if(cur_clip.play_type == 'm'){  //메인
                    dHttp.send('file', 'procUpdateCount', {file_srl : cur_clip.file_srl}).then(function(res){
                        console.log(res);
                    }, function(res){
                        console.log(res);
                    });
                }else{  //데모
                    xiHttp.send('file', 'procUpdateCount', {file_srl : cur_clip.file_srl}).then(function(res){
                        // console.log(res);
                    }, function(res){
                        console.log(res);
                    });
                }

                console.log('play time = ' + cur_clip.limit + '초');

                var arr = temp.transition.split('-');
                // var transOpt = {};
                transOpt = {};
                var duration = 600; // 효과 전환 시간

                if (arr[0] == 'fade') {
                    transOpt.type = 'fade';
                } else {
                    transOpt.type = arr[0];
                    transOpt.direction = arr[1];
                }
                transOpt.duration = duration;

                // 이미지일땐 setTimeout 사용
                if(cur_clip.file_type.indexOf('image') == 0) {
                    $scope.sequence.time_id1 = setTimeout(function () {


                        clearTimeout($scope.sequence.time_id1);
                        $scope.sequence.setCurSeq(next_clip, transOpt);

                    }, 1000 * cur_clip.limit + 700);

                }

                // 비디오일땐 ended 이벤트 사용
                $scope.$on('videoEvent.ended', function(){
                    console.log('비디오 재생이 끝났습니다');
                    clearTimeout($scope.sequence.time_id1);
                    $scope.sequence.setCurSeq(next_clip, transOpt);
                });


            }else{
                $scope.sequence.time_id2 = setTimeout(function(){
                    $scope.sequence.cur_seq = 0;
                    
                    // $state.go('player.demo', {cur_clip : 0});
                    $ionicNativeTransitions.stateGo('player.demo', {cur_clip: 0}, {}, {"type":"fade"});
                },500);
            }
        });

        // 이미지를 탭했을때
        $scope.tab_image = function(){
            clearTimeout($scope.sequence.time_id1);
            clearTimeout($scope.sequence.time_id2);
            if($scope.play_image) {
                $scope.play_image = false;
                console.log('이미지를 멈춤');
            }else{
                $scope.play_image = true;
                console.log('이미지를 재동작');
                $scope.sequence.time_id1 = setTimeout(function () {
                    $scope.sequence.setCurSeq(next_clip, transOpt);
                }, 1000);   // 멈춘후 재시작하면 1초
            }
        };

        // 비디오를 탭했을때
        $scope.tab_video = function(){
            clearTimeout($scope.sequence.time_id1);
            clearTimeout($scope.sequence.time_id2);
            $scope.play_video = !$scope.play_video;
        };

    });

