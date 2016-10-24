var productsObject = {
  products : {},
  add : function(id) {
    this.products[id] = this.products[id] || 0;
    this.products[id]++;
  },
  remove : function(id) {
    this.products[id]--;
    if (this.products[id] <= 0) {
      delete this.products[id];
    }
  }
};

var productsUUIDs = {
    uuids: []
};

var recommendationUUID = storage.get("suggestion_uuid");

var EventsService = function() {
  var service = this;
  this.callbacks = {};
  this.forced = {};
  this.obj = {};

  this.methods = {
    set : function(param, value) {
      // console.warn('set', param, 'to', value);
      service.checkParam(param, value);
      service.obj[param] = value;
    },
    subscribe : function(param, callback, forced) {
      //console.warn('subscribe', param);
      service.callbacks[param] = service.callbacks[param] || [];
      service.callbacks[param].push(callback);

      if (forced) {
        service.forced[param] = true;
      }
    }
  }

  this.checkParam = function(param, value) {
    if (this.obj[param] != value || this.forced[param]) {
      this.emit(param, value);
    }
  }
  this.emit = function(param, value) {
    if (!this.callbacks[param]) return;
    for (i in this.callbacks[param]) {
      this.callbacks[param][i](value);
    }
  }
  return this.methods;
},
eventsService = new EventsService(),
misc = {
  createElem : function(elemName, className, text) {
      var el = document.createElement(elemName);
      el.className = className;
      el.innerText = text || '';
      return el;
  },
  numberWithSpaces : function(x) {
    var parts = x.toFixed(2).toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(".");
  }, 
  makePrice : function(price) {
    return misc.numberWithSpaces(price) + ' ₽';
  },
  JSONedObject : function(str) {
    return JSON.parse(str);
  }
};

window.onload = function() {
    var bindings = {
    // id : { ...bindings }
    }
    var receiptSum;
    var root = document.getElementById('root'),
      title,
      container;
    var build = function() {
      container = misc.createElem('div', 'container');
      root.appendChild(container);
      var passedData  = JSON.parse(jsData.getData());
      var suggestedProducts = passedData.suggestions;
      receiptSum = passedData.receiptSum;
      for (var i in suggestedProducts) {
        var prod = misc.JSONedObject(suggestedProducts[i]);
        a = misc.createElem('div', 'each-product');
        a.id = prod["UUID"];
        text = misc.createElem('span', 'product__title', prod["NAME"]);
        buttons_container = misc.createElem('span', 'product__buttons-container');

        decr_button = misc.createElem('span', 'product__button remove listened-button inactive', '-');
        decr_button.productId = prod["UUID"];
        decr_button.actionType = 'remove';
        decr_button.addEventListener('click', listeners.buttonIncDecr, false);

        counter = misc.createElem('span', 'product__counter inactive', '0');
        price = misc.createElem('span', 'product__price', misc.numberWithSpaces(prod["PRICE_OUT"]/100));

        incr_button = misc.createElem('span', 'product__button add listened-button', '+');
        incr_button.productId = prod["UUID"];
        incr_button.actionType = 'add';
        incr_button.addEventListener('click', listeners.buttonIncDecr, false);

        next_button = misc.createElem('button', 'next-button', 'К ОПЛАТЕ');
        next_button.addEventListener('click', listeners.buttonNext, false);


        (function(prod, inc_button, decr_button, counter) {
          eventsService.subscribe(prod["UUID"], function(value) {
            if (!value || value <= 0) {
                if (decr_button.className.match('inactive')) return;
                decr_button.className += ' inactive';
                counter.innerText = 0;
                counter.className = counter.className += ' inactive';
            } else {
                decr_button.className = decr_button.className.replace(' inactive', '');
                counter.innerText = value || 0;
                counter.className = counter.className.replace(' inactive', '');
            }
          }, true);
        })(prod, incr_button, decr_button, counter);

        buttons_container.appendChild(decr_button);
        buttons_container.appendChild(counter);        
        buttons_container.appendChild(incr_button);

        a.appendChild(text);
        a.appendChild(price);
        a.appendChild(buttons_container);
        container.appendChild(a);
      }

      final_price = misc.createElem('span', 'final-price', misc.makePrice(+receiptSum));

      root.appendChild(next_button);
      next_button.appendChild(final_price);

      eventsService.subscribe('change', function() {
            productsUUIDs.uuids = [];
            var _final_price = +receiptSum;
            for (var i in suggestedProducts) {
              var prod = JSON.parse(suggestedProducts[i]);
              if (productsObject.products[prod["UUID"]]) {
                productsUUIDs.uuids.push(prod["UUID"]);
                _final_price += (prod["PRICE_OUT"]/100).toFixed(2) * productsObject.products[prod["UUID"]];
              }
            }
            final_price.innerText = misc.makePrice(_final_price);
      }, true);
    }

    var listeners = {
      buttonIncDecr : function(evt) {
        var target = evt.currentTarget;
        switch (target.actionType) {
          case 'add':
            receipt.addPosition(target.productId);
            break;
          case 'remove':
            receipt.removePosition(target.productId);
            break;
          default:
            break;
        }
        productsObject[target.actionType](target.productId);
        eventsService.set(target.productId, productsObject.products[target.productId]);
        eventsService.set('change', true);
      },
      buttonNext : function() {
        var extraData = {
            "recommendationUuid": recommendationUUID,
            "items": productsUUIDs.uuids
        }
        receipt.addExtraReceiptData(JSON.stringify(extraData));
        navigation.pushNext();
      }
    }
    build();
};
