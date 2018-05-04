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

    if(sourceHandler.captions){
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
            player.trigger('remoteTrackUpdated', data)
          }
        })

      }
      captions.addItems(items)
    }
  }

  const setHlsTextTracks = () => {
    if (sourceHandler.plugin.sardiusHLS.hls) {

      const getTracks = new Promise((resolve) => {
        sourceHandler.plugin.sardiusHLS.hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (event, data) => {
          const newTracks = data.subtitleTracks;
          resolve(newTracks);
        });
      });

      const getCaptions = new Promise((resolve) => {
        sourceHandler.plugin.sardiusHLS.hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {
          const tracks = player.el().getElementsByTagName("video")[0].textTracks;
          const closedCaptionsElement = document.getElementsByClassName('vjs-icon-captions')[0];
          const isElementHidden = closedCaptionsElement.classList.contains('vjs-hidden');
          if (captions.items.length === 0 && isElementHidden === false) {
            closedCaptionsElement.classList.add('vjs-hidden');
          }
          if (tracks.length !== 0 && captions.items.length === 0) {
            resolve(tracks);
          }
          // TODO: Decide if Closed Captions Button Should display/remove dynamically
          // else if (tracks.length === 0 && isElementHidden === false) {
          //   closedCaptionsElement.classList.add('vjs-hidden');
          // }
        });
      })

      const promises = [getTracks, getCaptions];

      Promise.all(promises).then((tracks) => {
        const items = [];
        const subtitles = tracks[0];
        const allTracks = Array.from(tracks[1]);
        const combinedTracks = subtitles.concat(allTracks);
        sourceHandler.plugin.sardiusHLS.hls.subtitleDisplay = true;
        sourceHandler.plugin.sardiusHLS.hls.subtitleTrack = -1;               sourceHandler.plugin.sardiusHLS.hls.subtitleDisplay = false;
        for (let i = 0; i < combinedTracks.length; i += 1) {
          if (combinedTracks[i].type === 'SUBTITLES') {
            let active = false;
            // TODO: automatically turn on sub track if default=true
            // if (combinedTracks[i].default === true) {
            //   sourceHandler.plugin.sardiusHLS.hls.subtitleDisplay = true;
            //   active = false;
            // }
          if (combinedTracks[i].forced === true) {
            continue;
          }
          items.push({
            classes: 'sp-bitrate-auto',
            label: combinedTracks[i].label || combinedTracks[i].name,
            id: `${i}`,
            order: combinedTracks.length - i,
            isActive: active,
            data: combinedTracks,
            callback: (data, button) => {
              if (button.isActive) {
                sourceHandler.plugin.sardiusHLS.hls.subtitleTrack = -1;
                captions.setActiveItem()
                sourceHandler.plugin.sardiusHLS.hls.subtitleDisplay = false;
                return;
              }
              for (let i = 0; i < combinedTracks.length; i += 1) {
                if (combinedTracks[i].mode !== typeof undefined) {
                  combinedTracks[i].mode = 'disabled';
                }
              }
              sourceHandler.plugin.sardiusHLS.hls.subtitleDisplay = true;
              sourceHandler.plugin.sardiusHLS.hls.subtitleTrack = i;
              captions.setActiveItem(button);
              player.trigger('hlsSubtitleTrackUpdated', data[i]);
            },
          });
        } else if (combinedTracks[i].kind === 'captions') {
            let sortOrder = combinedTracks.length - i;
            if (combinedTracks[i].language === 'es') {
              sortOrder = -1;
            }
            items.push({
              classes: 'sp-bitrate-auto',
              label: combinedTracks[i].name || combinedTracks[i].label,
              id: `${i}`,
              order: sortOrder,
              isActive: false,
              data: combinedTracks,
              callback: (data, button) => {
                if (button.isActive) {
                  combinedTracks[i].mode = 'disabled';
                  captions.setActiveItem();
                  return;
                }
                if (i === 0 && combinedTracks.length > 1) {
                  combinedTracks[1].mode = 'disabled';
                } else if (combinedTracks.length > 1) {
                  combinedTracks[0].mode = 'disabled';
                }
                combinedTracks[i].mode = 'showing';
                sourceHandler.plugin.sardiusHLS.hls.subtitleTrack = -1;
                sourceHandler.plugin.sardiusHLS.hls.subtitleDisplay = false;
                captions.setActiveItem(button);
                player.trigger('hlsCaptionsUpdated', data[i]);
              },
            });
        } else if (combinedTracks[i].kind === 'metadata') {
          continue;
        }
      }
        captions.addItems(items);
      });
    }
  };

  player.on("settingsMenu-SourceHandler-change",(event, SourceHandler) => {
    sourceHandler=SourceHandler;
    setHlsTextTracks();
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
