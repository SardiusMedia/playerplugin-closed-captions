const Component = videojs.getComponent('Component');

const closedCaptions = videojs.extend(Component, {
  constructor(player, options) {
    var menu = new sardius.libs.MenuMaker(player,{anOption:options})
    menu.addClass("vjs-icon-captions")
    var sourceHandler;
    //var menuLabels = {}
    var activeTrack;
    var ccEl;
    var userAgent  = navigator.userAgent;
    const isIpad = navigator.userAgent.indexOf('iPad') !== -1;
    var isSafari   = userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Chrome") === -1 ;
    var isIphone   = isSafari && (userAgent.indexOf("iPhone") !== -1 || userAgent.indexOf("iPod") !== -1)
    const isSafariIos = isIphone || (isSafari && isIpad);
    isSafari = isSafari && isIphone
    var getMenuLabel = (defaultLabel)=> {
      var menuLabels = sourceHandler.options.labels
      var cleanLabel = defaultLabel.toLowerCase().replace(/[^a-z0-9]+/gi, "");
      if (typeof menuLabels[cleanLabel] !== "undefined") {
        defaultLabel = menuLabels[cleanLabel];
      }
      return defaultLabel;
    }

    var captions = menu.addGroup({
      classes:"sp-captions",
      id:"sp-captions",
      title:"Closed Captions",
      minItems:1,
    })

    /*
    * TODO: fix menu group functionality
    * This is a fix for the positioning of the CC icon for iOS Safari live streams
    */
    if (isSafariIos) {
      if (typeof player.playerManager.plugin.options.asset.assets.stream !== 'undefined') {
        menu.el_.classList.add('sp-captions-ios-live');
      }
      // menu.el_.addEventListener('touchstart', (event) => {
      //   console.log('touch');
      //   const items = menu.el_.childNodes;
      //   if (event.target.classList.contains('sp-menu')) {
      //     console.log('HandleClasses');
      //     for (let i = 0; i < items.length; i += 1) {
      //       items[i].classList.toggle('vjs-lock-showing');
      //     }
      //   }
      // });
    }
    /* eslint-enable no-underscore-dangle */

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

    var setCaptions = () => {

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
            classes:"sp-menu-item",
            label:getMenuLabel(cc.label),
            selectable: true,
            isActive:false,
            data:cc,
            callback:(data, button)=>{
              if(button.isSelected_){
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
      player.on('SP_LIB_READY', () => {
        if (sourceHandler.plugin.streamHandler.lib.hls) {

          const getTracks = new Promise((resolve) => {
            player.on('SP_TEXT_TRACK_UPDATED_LIST', (event, data) => {
              const newTracks = data.subtitleTracks;
              resolve(newTracks);
            });
          });

          const getCaptions = new Promise((resolve) => {
            player.on('SP_FRAGMENT_AFTER_CHANGE', (event, data) => {
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
            sourceHandler.plugin.streamHandler.setTextTrackDisplay(true);
            sourceHandler.plugin.streamHandler.setCurrentTextTrack(-1);
            sourceHandler.plugin.streamHandler.setTextTrackDisplay(false);
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
                classes: 'sp-menu-item',
                label: combinedTracks[i].label || combinedTracks[i].name,
                id: `${i}`,
                order: combinedTracks.length - i,
                isActive: active,
                selectable: true,
                data: combinedTracks,
                callback: (data, button) => {
                  if (button.isSelected_) {
                    sourceHandler.plugin.streamHandler.setCurrentTextTrack(-1);
                    captions.setActiveItem()
                    sourceHandler.plugin.streamHandler.setTextTrackDisplay(false);
                    return;
                  }
                  for (let i = 0; i < combinedTracks.length; i += 1) {
                    if (combinedTracks[i].mode !== typeof undefined) {
                      combinedTracks[i].mode = 'disabled';
                    }
                  }
                  sourceHandler.plugin.streamHandler.setTextTrackDisplay(true);
                  sourceHandler.plugin.streamHandler.setCurrentTextTrack(i);
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
                  classes: 'sp-menu-item',
                  label: combinedTracks[i].name || combinedTracks[i].label,
                  id: `${i}`,
                  order: sortOrder,
                  isActive: false,
                  selectable: true,
                  data: combinedTracks,
                  callback: (data, button) => {
                    if (button.isSelected_) {
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
                    sourceHandler.plugin.streamHandler.setCurrentTextTrack(-1);
                    sourceHandler.plugin.streamHandler.setTextTrackDisplay(false);
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
      });
    };

    player.on("settingsMenu-SourceHandler-change",(event, SourceHandler) => {
      menu.hide()
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
  }
});

sardius.menu('closed-captions', closedCaptions);
