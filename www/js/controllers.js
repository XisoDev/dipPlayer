/**
 * Created by overcode on 2016. 12. 12..
 */
xisoDip

    .controller('authCtrl', function($scope, Auth, $state){
        $scope.svAuth = Auth;

        $scope.goDemo = function(){
            $state.go('demo');
        };
    })

    .controller('playCtrl', function($scope){

    })

    .controller('demoCtrl', function($scope, $state, $stateParams, xiFile, xiHttp, Toast, Sequence, xisoConfig){
        $scope.xiFile = xiFile;

        $scope.getSequence = function(){
            xiHttp.send('seq','dispGetDemoSeq').then(function(res){
                console.log(res);
                if(res.data.error == 0){
                    Sequence.setSequence(res.data.seq, 'm');    // m : main_server

                    xiFile.download(Sequence.timelines, Sequence.dir, xisoConfig.url);

                    $scope.checkSequence();
                }else{
                    Toast(res.data.message);
                }
            }, function(res){ console.log(res); });
        };

        $scope.checkSequence = function(){
            if(window.localStorage['seq'] && Sequence.timelines) {
                $state.go('demoDetail', {cur_clip : 0});

            }else {
                // 없으면 즉시 구함
                $scope.getSequence();
            }
        };

        $scope.checkSequence();
    })

    .controller('demoDetailCtrl', function($scope, $state, xiFile, Sequence, $stateParams, $timeout, $ionicNativeTransitions){
        $scope.sequence = Sequence;

        if($scope.sequence.timelines) {
            var index = $stateParams.cur_clip;
            var cur_clip = $scope.sequence.timelines[index];
            var len = $scope.sequence.timelines.length;

            console.log(cur_clip);

            $scope.clip_info = {
                type : cur_clip.type,
                file_type : cur_clip.file_type,
                content : cordova.file.externalDataDirectory + Sequence.dir + cur_clip.file
            };

            $timeout(function(){
                if(len > (Number(index) + 1)) {
                    var arr = cur_clip.transition.split('-');
                    var obj = {};
                    var duration = 1000;
                    if(arr[0] == 'fade'){
                        obj.type = 'fade';
                        obj.duration = duration;
                    }else {
                        obj.type = arr[0];
                        obj.direction = arr[1];
                        obj.duration = duration;
                    }
                    console.log(obj);

                    $ionicNativeTransitions.stateGo('demoDetail', {cur_clip : (Number(index) + 1)}, {}, obj);
                }else{
                    $state.go('authentication');
                }
            }, 1000 * cur_clip.limit);
        }
    });

