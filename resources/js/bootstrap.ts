// resources/js/bootstrap.ts
import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// VERIFY: axios needs this to actually read/send the XSRF-TOKEN cookie on
// requests to your own domain. Some axios versions/configs need this set
// explicitly rather than relying on defaults — if auto-save starts
// returning 419 errors, this is the first thing to check.
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;
