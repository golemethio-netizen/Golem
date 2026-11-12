/* Wana Dating: country list + helpers (global site). */
(function(){
  var C = ["Afghanistan","Albania","Algeria","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belgium","Benin","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Chad","Chile","China","Colombia","Congo (DRC)","Costa Rica","Côte d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Eritrea","Estonia","Ethiopia","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Liberia","Libya","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Mali","Malta","Mauritius","Mexico","Moldova","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway","Oman","Pakistan","Palestine","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Türkiye","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe","Other"];
  window.WANA_COUNTRIES = C;
  window.wanaCountryOptions = function(current, firstLabel){
    var h = firstLabel ? '<option value="">' + firstLabel + '</option>' : '<option value="">Select country</option>';
    var seen = false;
    C.forEach(function(c){ var s = c === current; if (s) seen = true; h += '<option value="' + c.replace(/"/g,'&quot;') + '"' + (s ? ' selected' : '') + '>' + c + '</option>'; });
    if (current && !seen) h += '<option value="' + String(current).replace(/"/g,'&quot;') + '" selected>' + String(current).replace(/</g,'&lt;') + '</option>';
    return h;
  };
  function fill(){
    var f = document.getElementById('fCountry'); if (f && !f.options.length) f.innerHTML = wanaCountryOptions('', 'Select country');
    var q = document.getElementById('filterCountry'); if (q && q.options.length < 2) q.innerHTML = wanaCountryOptions('', 'All countries');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
