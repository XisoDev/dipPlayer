// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var xisoDip = angular.module('dip', ['ionic'])

    .run(function($ionicPlatform, Auth) {
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
    })

    .constant('xisoConfig', {
        url: '/api'
        // url: 'http://dip.xiso.co.kr'
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
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/play');
    });
