// ==UserScript==
// @name         Freehand Circles Drawing Tool
// @namespace    http://stackexchange.com/users/4337810/
// @version      1.0
// @description  A userscript that lets you draw directly onto images on any Stack Exchange site to add freehand circles (or anything else you might like to add)!
// @author       ᔕᖺᘎᕊ (http://stackexchange.com/users/4337810/)
// @match        *://*.stackexchange.com/*
// @match        *://*.stackoverflow.com/*
// @match        *://*.superuser.com/*
// @match        *://*.serverfault.com/*
// @match        *://*.askubuntu.com/*
// @match        *://*.stackapps.com/*
// @match        *://*.mathoverflow.net/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

$('head').append('<script type="text/javascript" src="http://cdnjs.cloudflare.com/ajax/libs/fabric.js/1.5.0/fabric.min.js"></script>');        

function addToImgurData(dataURL, callback) { //add NEW image to imgur (ie. the image the user has drawn)
    $.ajax({ 
        url: 'https://api.imgur.com/3/image',
        headers: {
            'Authorization': 'Client-ID 1ebf24e58286774'
        },
        type: 'POST',
        data: {
            'image': dataURL.split(',')[1]
        },
        success: callback,
        error: function(data) {
            alert("Error posting new freehand image to imgur. Status: "+data.status+".");                    
        }
    });
}

function addToImgurURL(URL, callback) { //add the OLD ORIGINAL image to imgur. Because it seems stack.imgur.com DOES NOT support CORS, but imgur.com does, hence the transfer
    $.ajax({ 
        url: 'https://api.imgur.com/3/image',
        headers: {
            'Authorization': 'Client-ID 1ebf24e58286774'
        },
        type: 'POST',
        data: {
            'image': URL
        },
        success: callback,
        error: function(data) {
            alert("Error posting old image to imgur. Status: "+data.status+".");
        }
    });
}

function deleteImage(hash) { //delete the i.imgur.com version of the OLD ORIGINAL stack.imgur.com image - we don't need it any more!
    $.ajax({
        url: 'https://api.imgur.com/3/image/'+hash,
        headers: {
            'Authorization': 'Client-ID 1ebf24e58286774'
        },
        type: 'DELETE',
        success: function(data) { 
            console.log(data); 
        },
        error: function(data) {
            alert("Error deleting new image from imgur. Status: "+data.status+".");                    
        }
    });    
}

$('.question img, .answer img').not('.fw img').each(function () { //add edit and delete buttons to all images
    $(this).after("<input class='edit' style='position:absolute; right:10px;' type='button' value='edit'><br><input type='button' id='save' style='position:absolute; right:10px;' value='save' class='save'>");
});

$(document).on('click', '.edit', function () { //edit
    var origImage = $(this).parent().find('img');
    var height = origImage.height(),
        width = origImage.width();
    $that = $(this);
    
    addToImgurURL(origImage.attr('src'), function(result) {
        var newLink = result.data.link,
            deletehash = result.data.deletehash;
        //Add the new canvas:
        $that.parent().find('img').replaceWith("<div id='wrapper' style='position:relative; display:inline-block;'><canvas style='position:absolute' id='edit_canvas' height='" + height + "' width='" + width + "'></canvas></div>");

        //initalize canvas with fabric.js
        var canvas = window._canvas = new fabric.Canvas('edit_canvas', {
            isDrawingMode: 1
        });

        //Settings:
        canvas.freeDrawingBrush.color = "red";
        canvas.freeDrawingBrush.width = 5;

        //background image (ie *the* image):
        fabric.Image.fromURL(newLink, function (oImg) { //use 'newLink' <-- which is the NEW link at imgur.com and NOT stack.imgur.com because stack.imgur.com does not support CORS :(
            oImg.scale(1.0);
            oImg.width = width;
            oImg.height = height;
            canvas.add(oImg).setActiveObject(oImg);
            canvas.renderAll();
        }, {
            crossOrigin: 'Anonymous' //the annoying crossorigin, which btw wouldn't work with a stack.imgur.com url :(
        });
        
        $(document).on('click', '.save', function() { //save
            var dataURL = canvas.toDataURL({format:'png'}); //DATA URL as a png       
            $that = $(this);
            addToImgurData(dataURL, function(data) { //save dataurl to imgur
                parent = $that.parents('div.question,div.answer');
                if(parent.hasClass('question')) { //for questions
                   id = parent.attr('data-questionid');
                } else { //for answers
                   id = parent.attr('data-answerid');
                }
                var accessToken = "(aMH8lYnH259iXl(O*h5Xg))",
                    sitename = $(location).attr('hostname');

                link = "https://api.stackexchange.com/2.2/answers/"+id+"?order=desc&sort=activity&site="+sitename+"&filter=!9YdnSMldD"; //form the stackexchange api link

                $.getJSON(link, function(json) { //edit the post with the new link
                    body = json.items[0].body_markdown;
                    x = origImage.attr('src').split('/')[3]; //get the original filename eg. dEOmp2.png
                    regex = new RegExp("(http:.*?"+x+")", "gi");
                    y = body.replace(regex, data.data.link); //replace the original URL with the NEW URL
                    $.ajax({ //Make the edit
                        type: "POST",
                        url: "https://api.stackexchange.com/2.2/answers/259022/edit",
                        data: {
                            'body': y,
                            'site': 'meta',
                            'key': 'zOQ03LXlnDCLSM7yV)UVww((',
                            'access_token': accessToken,
                            'filter': '!9YdnSMlgz',
                            'comment': 'Added freehand drawings (added by <http://stackapps.com/q/6353/26088>!)'
                        }
                    }).done(function() { //if this succeeds, delete the image we copied from stack.imgur.com to imgur.com because it is no longer needed!
                        deleteImage(deletehash);                             
                    });
                }); //Stack Exchange API JSON function
            }); //addToImgurData callback
        }); //save click handler
    }); //addToImgurURL callback
}); //edit click handler
