// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var xisoDip = angular.module('dip', ['ionic','ngCordova','ionic-native-transitions'])

    .run(function($ionicPlatform, $rootScope, $ionicPopup, Auth) {
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
                StatusBar.styleDefault();
            }

            // console.log(ionic.Platform.device());// returns an object containing device uuid,version, platform, manufacturer ...
            
            Auth.setDeviceInfo(ionic.Platform.device());

            Auth.getAuth();
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
        url: 'http://dip.xiso.co.kr/'    // 실제 기기 테스트용
    })

    .config(function($stateProvider, $urlRouterProvider){
        $stateProvider
            .state('authentication', {
                url: '/auth',
                templateUrl: 'templates/auth.html',
                controller: 'authCtrl'
            })

            .state('play', {
                url: '/play',
                templateUrl: 'templates/play.html',
                controller: 'playCtrl',
                onEnter: function($state, Auth){
                    if(!Auth.isAuthenticated()){
                        $state.go('authentication');
                    }
                }
            })

            .state('demo', {
                url: '/demo',
                templateUrl: 'templates/demo.html',
                controller: 'demoCtrl'
            })

            .state('demoDetail', {
                url: '/demo/:cur_clip',
                templateUrl: 'templates/demo.html',
                controller: 'demoDetailCtrl'
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/play');
    });
