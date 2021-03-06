// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var xisoDip = angular.module('dip', ['ionic','ngCordova','ionic-native-transitions'])

    .run(function($ionicPlatform, $rootScope, $ionicPopup, xService) {
        $ionicPlatform.ready(function() {
            if(window.cordova && window.cordova.plugins.Keyboard) {
                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

                // Don't remove this line unless you know what you are doing. It stops the viewport
                // from snapping when text inputs are focused. Ionic handles this internally for
                // a much nicer keyboard experience.
                cordova.plugins.Keyboard.disableScroll(true);
            }
            if(window.StatusBar) {
                // StatusBar.styleDefault();
                StatusBar.hide();
            }

            // console.log(ionic.Platform.device());// returns an object containing device uuid,version, platform, manufacturer ...

            xService.fileObj = cordova.file;
            console.log('fileObj---');
            console.log(xService.fileObj);

            xService.setDeviceInfo(ionic.Platform.device());

            if(xService.main_seq.play_type == 'm'){
                console.log('메인 플레이로 이동');
                xService.is_auth = true;
                xService.getAuth();
            }else{
                console.log('데모 플레이로 이동');
                xService.getAuth();
            }

            // console.log(Sequence.main_seq);

            /*if(Sequence.main_seq.play_type == 'm') {
                console.log('메인 플레이로 이동');
                Auth.is_auth = true;

                Auth.getSeq();
            }else{
                console.log('데모 플레이로 이동');
                Auth.getAuth();
            }*/
        });

        //back button action
        $ionicPlatform.registerBackButtonAction(function(e) {

            e.preventDefault();

            $rootScope.exitApp = function() {
                $ionicPopup.confirm({
                    title: "<strong>앱을 종료할까요?</strong>",
                    template: '확인하시면 앱을 종료할 수 있습니다.',
                    buttons: [
                        { text: '취소' },
                        {
                            text: '<b>종료</b>',
                            type: 'button-positive',
                            onTap: function(e) {
                                ionic.Platform.exitApp();
                            }
                        }
                    ]
                });
            };
            $rootScope.exitApp();

            return false;
        }, 101);
    })

    .constant('xisoConfig', {
        // url: '/api/'    // PC 테스트용
        url: 'http://master.softgear.kr/'    // 실제 기기 테스트용
    })

    .directive('qrcode', function($interpolate) {
        return {
            restrict: 'E',
            link: function($scope, $element, $attrs) {

                var options = {
                    text: '',
                    width: 100,
                    height: 100,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: 'H'
                };

                Object.keys(options).forEach(function(key) {
                    options[key] = $interpolate($attrs[key] || '')($scope) || options[key];
                });

                options.correctLevel = QRCode.CorrectLevel[options.correctLevel];

                new QRCode($element[0], options);

            }
        };
    })

    .directive('videoControl', function ($rootScope) {
        return function ($scope, $element, attrs) {

            attrs.$observe("controlPlay", function(value) {
                // console.log('controlPlay: '+value);
                value = (value == 'false' ? false : true);
                if (value==false) {
                    console.log('  > stop');
                    $element[0].pause();
                } else {
                    console.log('  > play');
                    $element[0].play();
                }
            });

            $element[0].addEventListener("loadeddata", function () {
                console.log('loadeddata');
                $rootScope.$broadcast('videoEvent.loadeddata', { type: 'loadeddata' });
            });
            $element[0].addEventListener("playing", function () {
                console.log('playing');
                $rootScope.$broadcast('videoEvent.playing', { type: 'playing' });
            });
            $element[0].addEventListener("ended", function () {
                console.log('ended');
                $rootScope.$broadcast('videoEvent.ended', { type: 'ended' });
            });
            $element[0].addEventListener("pause", function () {
                // console.log($element[0].currentTime);
                console.log('pause');
                $rootScope.$broadcast('videoEvent.pause', { type: 'pause' });
            });
            // and so on...
        }
    })

    .config(function($ionicNativeTransitionsProvider){
        $ionicNativeTransitionsProvider.setDefaultOptions({
            duration: 1000 // in milliseconds (ms), default 400,
            // slowdownfactor: 30, // overlap views (higher number is more) or no overlap (1), default 4
            // iosdelay: -1, // ms to wait for the iOS webview to update before animation kicks in, default -1
            // androiddelay: -1, // same as above but for Android, default -1
            // winphonedelay: -1, // same as above but for Windows Phone, default -1,
            // fixedPixelsTop: 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
            // fixedPixelsBottom: 0, // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
            // triggerTransitionEvent: '$ionicView.afterEnter', // internal ionic-native-transitions option
            // backInOppositeDirection: false // Takes over default back transition and state back transition to use the opposite direction transition to go back
        });
    })

    .config(function($stateProvider, $urlRouterProvider){
        $stateProvider
            // .state('authentication', {
            //     url: '/auth',
            //     templateUrl: 'templates/auth.html',
            //     controller: 'authCtrl'
            // })
            //
            // .state('play', {
            //     url: '/play/:cur_clip',
            //     templateUrl: 'templates/play.html',
            //     controller: 'playCtrl',
            //     onEnter: function($state, Auth){
            //         if(!Auth.isAuthenticated()){
            //             $state.go('authentication');
            //         }else{
            //             // if(!Auth.isGotSeq()) {
            //             //     $state.go('demo');  // 아직 할당된 시퀀스가 없으면 데모 플레이
            //             // }
            //         }
            //     }
            // })
            .state('player', {
                url: '/player',
                abstract: true,
                templateUrl: 'templates/layout.html',
                controller: 'playerCtrl'
            })

            .state('player.temp', {
                url: '/temp',
                views: {
                    'player-demo': {
                        templateUrl: 'templates/temp.html',
                        controller: 'tempCtrl'
                    }
                }
            })

            .state('player.demo', {
                url: '/demo/:cur_clip',
                views: {
                    'player-demo': {
                        templateUrl: 'templates/demo.html',
                        controller: 'demoCtrl'
                    }
                }
            })

            .state('player.demo2', {
                url: '/demo2/:cur_clip',
                views: {
                    'player-demo': {
                        templateUrl: 'templates/demo2.html',
                        controller: 'demoCtrl'
                    }
                }
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/player/temp');
    });
