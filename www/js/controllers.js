/**
 * Created by overcode on 2016. 12. 12..
 */
xisoDip

    .controller('authCtrl', function($scope, Auth, $state){
        $scope.svAuth = Auth;

        $scope.goDemo = function(){
            $state.go('player.demo');
        };
    })

    .controller('playerCtrl', function($scope, Sequence, Auth){
        $scope.sequence = Sequence;
        $scope.auth = Auth;
    })

    .controller('tempCtrl', function($scope, $state, $stateParams, xiFile, xiHttp, Toast, Sequence, xisoConfig, $ionicPlatform){
        $scope.xiFile = xiFile;
        $scope.sequence = Sequence;
        $scope.clip_info = {};

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
                $state.go('player.demo', {cur_clip: 0}); // 플레이 시킨다
            });
        } else { // 없으면 받아옴
            $scope.getDemo();
        }
    })

    .controller('demoCtrl', function($scope, $state, $stateParams, xiFile, xiHttp, Toast, Sequence){
        $scope.xiFile = xiFile;
        $scope.sequence = Sequence;
        $scope.clip_info = {};
        $scope.timeID;
        $scope.timeID2;

        // $scope.$on('$stateChangeSuccess', function () {
        $scope.$on('$ionicView.enter', function(e) {
            // console.log('state changed : ' + $stateParams.cur_clip);
            // if(cordova.file.externalDataDirectory == null) console.log('널이다');
            // else  console.log('널이 아니다');

            clearTimeout($scope.timeID);
            clearTimeout($scope.timeID2);

            if($scope.sequence.main_seq.timelines.length > 0 && cordova.file.externalDataDirectory != null) {
                var index = $stateParams.cur_clip ? $stateParams.cur_clip : 0;
                var cur_clip = $scope.sequence.main_seq.timelines[index];
                var len = $scope.sequence.main_seq.timelines.length;
                var first = $scope.sequence.main_seq.timelines[0];

                $scope.clip_info = {
                    file_type: cur_clip.file_type,
                    content: cordova.file.externalDataDirectory + $scope.sequence.main_seq.dir + cur_clip.file
                };

                var temp = {};
                var next_clip = 0;

                if (len > (Number(index) + 1)) {
                    temp = cur_clip;
                    next_clip = Number(index) + 1;
                } else {
                    temp = first;
                }

                console.log('play time = ' + temp.limit + '초');

                $scope.timeID = setTimeout(function () {
                    // console.log('아래는 demo 의 temp');
                    // console.log(temp);
                    var arr = temp.transition.split('-');
                    var obj = {};
                    var duration = 500;

                    if (arr[0] == 'fade') {
                        obj.type = 'fade';
                    } else {
                        obj.type = arr[0];
                        obj.direction = arr[1];
                    }
                    obj.duration = duration;

                    $scope.sequence.setCurSeq(next_clip, obj);

                }, 1000 * temp.limit) + 600;


            }else{
                $scope.timeID2 = setTimeout(function(){
                    $scope.sequence.cur_seq = 0;
                    $state.go('player.demo', {cur_clip : 0});
                },500);
            }
        });

    });

