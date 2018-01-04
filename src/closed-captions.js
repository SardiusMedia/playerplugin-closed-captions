sardius.menu("closed-captions",function(player, options){
  var menu = new sardius.libs.MenuMaker(player,{anOption:options})
  menu.addClass("vjs-icon-captions")
  var sourceHandler;
  //var menuLabels = {}
  var activeTrack;
  var ccEl;
  var userAgent  = navigator.userAgent;
  var isSafari   = userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Chrome") === -1 ;
  var isIphone   = isSafari && (userAgent.indexOf("iPhone") !== -1 || userAgent.indexOf("iPod") !== -1)
  isSafari = isSafari && isIphone
  var getMenuLabel = (defaultLabel)=> {
    var menuLabels = sourceHandler.options.labels
    var cleanLabel = defaultLabel.toLowerCase().replace(/[^a-z0-9]+/gi, "");
    if (typeof menuLabels[cleanLabel] !== "undefined") {
      defaultLabel = menuLabels[cleanLabel];
    }
    return defaultLabel;
  }

  var captions = menu.newGroup({
    classes:"sp-menu",
    id:"sp-bitrate",
    title:"Closed Captions",
    minItems:1, 
  })

  var setCaption = (track)=>{
    if(isSafari){
      return
    } 

    if(!ccEl){
      ccEl = document.createElement('div');
      ccEl.className = 'sp-captions-display';
      ccEl.innerHTML = '';
      player.el_.appendChild(ccEl);
    }

    if(activeTrack){
      activeTrack.removeEventListener('cuechange', cueChange, true)
    }
    if(!track && ccEl){
      ccEl.innerHTML = "";
      return;
    }
     
    player.addRemoteTextTrack({
      kind:"captions",
      label:getMenuLabel(track.label),
      srclang:track.label.toLowerCase(),
      src:track.file,
      mode:'showing'
    },true) 

  }

  var setCaptions = ()=>{
   
    var lables = [];
    var items  = [];

    if(sourceHandler.captions ){
      for(var i=0; i<sourceHandler.captions.length; i++){
        var cc = sourceHandler.captions[i]
        if(isSafari){ 
          
          var remoteTrack={
            kind:"captions",
            label:getMenuLabel(cc.label),
            srclang:cc.label.toLowerCase(),
            src:cc.file,
          }
          player.addRemoteTextTrack(remoteTrack,true) 
        }
       
        items.push({
          classes:"sp-bitrate-auto",
          label:getMenuLabel(cc.label),
          isActive:false,
          data:cc,
          callback:(data, button)=>{
            if(button.isActive){
              captions.setActiveItem()
              setCaption(false)
              return;
            }
            captions.setActiveItem(button)
            setCaption(data)
          }
        })
         
      }
      captions.addItems(items)
    }
  }

  player.on("settingsMenu-SourceHandler-change",(event, SourceHandler) => {
    sourceHandler=SourceHandler;
    setCaptions();
  })
  
  function cueChange(){  
      if(isSafari){
        return
      } 
      // Do something
      if(typeof ccEl !== "undefined"){
        ccEl.innerHTML = "";
      }

      if(this.activeCues_.length > 0){
        text = this.activeCues_[0].text
        text = text.split(/\n/)
        player.textTrackDisplay.hide()  
          
        var ccLine = document.createElement('div');
        ccLine.className = 'sp-captions-display-line';
        ccLine.innerHTML = "<div class='sp-captions-display-line-text'> "+text.join("<br />")+" </div>";
        ccEl.appendChild(ccLine);
        
      }
  }

  player.textTracks().addEventListener('addtrack', (addTrackEvent) =>  {
    activeTrack =  addTrackEvent.track
    setTimeout(()=>{activeTrack.showing = true},2000)

    activeTrack.addEventListener('cuechange', cueChange);
  });
  return menu
    
})

  
