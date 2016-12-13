/**
 * Created by overcode on 2016. 12. 12..
 */
angular.module('dip.services', [])

    /*.factory('xiHttp', function($http, xisoConfig){
        var service = {};

        var baseUrl = xisoConfig.url;
        var _finalUrl = '';

        service.send = function(module, act, params){

            if(act.indexOf('disp') == 0){
                _finalUrl = baseUrl + '/disp.php?module=' + module + '&act=' + act + '&callback=JSON_CALLBACK';
            }else{
                _finalUrl = baseUrl + '/proc.php?module=' + module + '&act=' + act + '&callback=JSON_CALLBACK';
            }

            return $http({
                method: 'POST',
                url: _finalUrl,
                data: params
            });
        };

        return service;
    })*/

    .factory('Auth', function() {

        var isAuthenticated = function() {
            return false;
        };

        return {
            isAuthenticated: isAuthenticated
        }
    });
