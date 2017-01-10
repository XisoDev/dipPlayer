/**
 * String to Number
 * overcode@xiso.co.kr
 */
function onum(str){
    var result = Number(str);
    if(isNaN(result)) result = 0;

    return result;
}

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