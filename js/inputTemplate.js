"use strict";

function createInputElement(attributeName) {
    let div = getHtml('inputTemplate.html');
    div.querySelector('label').setAttribute('for', attributeName);
    div.querySelector('label').innerHTML = attributeName + ':';
    div.querySelector('input').setAttribute('id', attributeName);
    div.querySelector('input').setAttribute('name', attributeName);
    return div;
}

function getHtml(url) {
    let capturedHtml;

    $.ajax({
        url: url,
        dataType: 'html',
        success: function(html) {
            capturedHtml = html;
        },
        async: false
    });

    return $.parseHTML(capturedHtml)[0];
}