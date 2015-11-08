// ==UserScript==
// @name         Freehand Circles Drawing Tool
// @namespace    http://stackexchange.com/users/4337810/
// @version      1.0.7
// @description  A userscript that lets you draw directly onto images on any Stack Exchange site to add freehand circles (or anything else you might like to add)!
// @author       ᔕᖺᘎᕊ (http://stackexchange.com/users/4337810/)
// @match        *://*.stackexchange.com/*
// @match        *://*.stackoverflow.com/*
// @match        *://*.superuser.com/*
// @match        *://*.serverfault.com/*
// @match        *://*.askubuntu.com/*
// @match        *://*.stackapps.com/*
// @match        *://*.mathoverflow.net/*
// @require      http://code.jquery.com/jquery-2.1.4.min.js
// @require      http://cdnjs.cloudflare.com/ajax/libs/fabric.js/1.5.0/fabric.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://github.com/shu8/Freehand-Circles-Drawing-Tool/raw/master/freehandCircles.user.js
// ==/UserScript==
if (window.location.href.indexOf('/users/') > -1) { //Add the add access token link
    $('.additional-links').append('<span class="lsep">|</span><a href="javascript:;" id="accessTokenLink-freehandCircles">freehand circles access-token</a>');
    $('.sub-header-links.fr').append('<span class="lsep">|</span><a href="javascript:;" id="accessTokenLink-freehandCircles">freehand circles access-token</a>'); //Old profile (pre Feb-2015)
    $('#accessTokenLink-freehandCircles').click(function() {
        var token = window.prompt('Please enter your access token:');
        if(token) {
            GM_setValue("freehandCircles-access_token", token);
        }
    });
}

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

if(GM_getValue('freehandCircles-access_token', -1) != -1) { //if an access token IS set
    $('.question img, .answer img').not('.fw img, .post-tag img').each(function () { //add edit and delete buttons to all images
        $(this).parent().css({
            'position': 'relative',
            'display': 'inline-block'
        });
        $(this).after("<input class='edit' style='position:absolute; right:50px; bottom:1px;' type='button' value='edit'><br><input type='button' id='save' style='position:absolute; right:1px; bottom:1px' value='save' class='save'>");
    });
    
    $(document).on('click', '.edit', function (e) { //edit
        $(this).hide();        
        
        //Setup variables:
        var origImage = $(this).parent().find('img');
        var height = origImage.height(),
            width = origImage.width();
        $that = $(this);

        addToImgurURL(origImage.attr('src'), function(result) {
            var newLink = result.data.link,
                deletehash = result.data.deletehash;
            //Add the new canvas:
            $that.parent().replaceWith("<div id='wrapper' style='position:relative; display:inline-block;'><canvas style='position:absolute' id='edit_canvas' height='" + height + "' width='" + width + "'></canvas><br><input type='button' id='save' style='position:absolute; right:1px; bottom:1px' value='save' class='save'></div>");
            //Toolbar:
            $('#edit_canvas').after("<div id='freehand-toolbar'>Colours: </div>");
            $('#freehand-toolbar').after("<br>Thickness: <input class='freehand-toolbar-button' id='freehand-toolbarRange' type='range' min='1' max='10' value='5'>"); //width
            var colors = ['red', 'white', 'black', 'pink']; //set colours
            for(i=0;i<colors.length;i++) { 
                $('#freehand-toolbar').after("<button class='freehand-toolbar-button' id='freehand-toolbar-"+colors[i]+"'>"+colors[i]+"</button>");
            }
            $('#freehand-toolbar').after("<input class='freehand-toolbar-button' id='freehand-toolbar-otherColor' type='color'>"); //manual colours

            $that.parent().click(function(e) {
                if($(e.target).is('.save, .freehand-toolbar-button')){
                    e.preventDefault();
                    return;
                }
                return false;
            });
            
            //initalize canvas with fabric.js
            var canvas = window._canvas = new fabric.Canvas('edit_canvas', {
                isDrawingMode: 1
            });

            //Settings:
            canvas.freeDrawingBrush.color = "red";
            canvas.freeDrawingBrush.width = 5;
            
            $(document).on('click', 'button[id*="freehand-toolbar-"]', function() {
                canvas.freeDrawingBrush.color = $(this).text();
            });            
            $(document).on('change', '#freehand-toolbar-otherColor', function() {
                canvas.freeDrawingBrush.color = $(this).val();
            });
            $(document).on('change', '#freehand-toolbarRange', function() {
                canvas.freeDrawingBrush.width = $(this).val();
            });

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
                $('.edit').show();
                var dataURL = canvas.toDataURL({format:'png'}), //DATA URL as a png    
                    link,
                    sitename = $(location).attr('hostname'),
                    accessToken = GM_getValue('freehandCircles-access_token'),
                    key = 'zOQ03LXlnDCLSM7yV)UVww((',
                    editURL;
                $that = $(this);
                addToImgurData(dataURL, function(data) { //save dataurl to imgur
                    parent = $that.parents('div.question,div.answer');
                    if(parent.hasClass('question')) { //for questions
                        id = parent.attr('data-questionid');
                        link = "https://api.stackexchange.com/2.2/questions/"+id+"?order=desc&sort=activity&site="+sitename+"&access_token="+accessToken+"&key="+key+"&filter=!9YdnSIoKx"; //form the stackexchange api link
                        editURL = "https://api.stackexchange.com/2.2/questions/"+id+"/edit";
                        $.getJSON(link, function(json) { //edit the post with the new link
                            body = json.items[0].body_markdown;
                            title = json.items[0].title;
                            tags = json.items[0].tags;
                            x = origImage.attr('src').split('/')[3]; //get the original filename eg. dEOmp2.png
                            regex = new RegExp("(http:.*?"+x+")", "gi");
                            y = body.replace(regex, data.data.link); //replace the original URL with the NEW URL
                            $.ajax({ //Make the edit
                                type: "POST",
                                url: editURL,
                                data: {
                                    'title': title,
                                    'tags': tags.join(' '),                                    
                                    'body': y.replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/, '"').replace(/&lt;/g, "<").replace(/&amp;/g, "&"),
                                    'site': sitename,
                                    'key': key,
                                    'access_token': accessToken,
                                    'filter': '!9YdnSMlgz',
                                    'comment': 'Added freehand drawings (added by <http://stackapps.com/q/6353/26088>!)'
                                }
                            }).done(function() { //if this succeeds, delete the image we copied from stack.imgur.com to imgur.com because it is no longer needed!
                                deleteImage(deletehash);                             
                                alert('Successfully edited new image! :)');
                            });
                        });
                    } else { //for answers
                        id = parent.attr('data-answerid');
                        link = "https://api.stackexchange.com/2.2/answers/"+id+"?order=desc&sort=activity&site="+sitename+"&access_token="+accessToken+"&key="+key+"&filter=!9YdnSMldD"; //form the stackexchange api link
                        editURL = "https://api.stackexchange.com/2.2/answers/"+id+"/edit";
                        $.getJSON(link, function(json) { //edit the post with the new link
                            body = json.items[0].body_markdown;
                            x = origImage.attr('src').split('/')[3]; //get the original filename eg. dEOmp2.png
                            regex = new RegExp("(http:.*?"+x+")", "gi");
                            y = body.replace(regex, data.data.link); //replace the original URL with the NEW URL
                            $.ajax({ //Make the edit
                                type: "POST",
                                url: editURL,
                                data: {
                                    'body': y.replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/, '"').replace(/&lt;/g, "<").replace(/&amp;/g, "&"),
                                    'site': sitename,
                                    'key': 'zOQ03LXlnDCLSM7yV)UVww((',
                                    'access_token': accessToken,
                                    'filter': '!9YdnSMlgz',
                                    'comment': 'Added freehand drawings (added by <http://stackapps.com/q/6353/26088>!)'
                                }
                            }).done(function() { //if this succeeds, delete the image we copied from stack.imgur.com to imgur.com because it is no longer needed!
                                deleteImage(deletehash);                             
                                alert('Successfully edited new image! :)');
                            });
                        }); //SE API call
                    } //question/answer if
                }); //addToImgurData callback
            }); //save click handler
        }); //addToImgurURL callback
        return false;
    }); //edit click handler
} else { //if access token is not set
    console.log('Please enter an access token. See more details at http://shu8.github.io/Freehand-Circles-Drawing-Tool');
}
