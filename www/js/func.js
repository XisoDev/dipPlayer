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

    console.log(a);
    console.log(b);

    // 공지사항이 다르면
    if(a.text_clip != b.text_clip) return false;

    // 타임라인 길이가 다르면
    if(a.timelines.length != b.timeline.length) return false;

    for(i =0 ; i < a.timelines.length ; i++){
        if(a.timelines[i].sid != b.timeline[i].sid){
            result = false;
            return false;
        }

        if(a.timelines[i].limit != b.timeline[i].duration){
            result = false;
            return false;
        }

        if(a.timelines[i].is_show_qr != b.timeline[i].is_show_qr){
            result = false;
            return false;
        }

        if(a.timelines[i].url != b.timeline[i].url){
            result = false;
            return false;
        }
    }

    return result;
};