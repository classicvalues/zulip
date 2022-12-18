import _ from "lodash";

import * as blueslip from "./blueslip";
import {$t} from "./i18n";

// From MDN: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Math/random
export function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Like C++'s std::lower_bound.  Returns the first index at which
// `value` could be inserted without changing the ordering.  Assumes
// the array is sorted.
//
// `first` and `last` are indices and `less` is an optionally-specified
// function that returns true if
//   array[i] < value
// for some i and false otherwise.
//
// Usage: lower_bound(array, value, less)
export function lower_bound(array, value, less) {
    let first = 0;
    const last = array.length;

    let len = last - first;
    let middle;
    let step;
    while (len > 0) {
        step = Math.floor(len / 2);
        middle = first + step;
        if (less(array[middle], value, middle)) {
            first = middle;
            first += 1;
            len = len - step - 1;
        } else {
            len = step;
        }
    }
    return first;
}

export const lower_same = function lower_same(a, b) {
    if (a === undefined || b === undefined) {
        blueslip.error(`Cannot compare strings; at least one value is undefined: ${a}, ${b}`);
        return false;
    }
    return a.toLowerCase() === b.toLowerCase();
};

export const same_stream_and_topic = function util_same_stream_and_topic(a, b) {
    // Streams and topics are case-insensitive.
    return a.stream_id === b.stream_id && lower_same(a.topic, b.topic);
};

export function is_pm_recipient(user_id, message) {
    const recipients = message.to_user_ids.split(",");
    return recipients.includes(user_id.toString());
}

export function extract_pm_recipients(recipients) {
    return recipients.split(/\s*[,;]\s*/).filter((recipient) => recipient.trim() !== "");
}

export const same_recipient = function util_same_recipient(a, b) {
    if (a === undefined || b === undefined) {
        return false;
    }

    if (a.type === "private" && b.type === "private") {
        if (a.to_user_ids === undefined) {
            return false;
        }
        return a.to_user_ids === b.to_user_ids;
    } else if (a.type === "stream" && b.type === "stream") {
        return same_stream_and_topic(a, b);
    }

    return false;
};

export const same_sender = function util_same_sender(a, b) {
    return (
        a !== undefined &&
        b !== undefined &&
        a.sender_email.toLowerCase() === b.sender_email.toLowerCase()
    );
};

export function normalize_recipients(recipients) {
    // Converts a string listing emails of message recipients
    // into a canonical formatting: emails sorted ASCIIbetically
    // with exactly one comma and no spaces between each.
    return recipients
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0)
        .sort()
        .join(",");
}

// Avoid URI decode errors by removing characters from the end
// one by one until the decode succeeds.  This makes sense if
// we are decoding input that the user is in the middle of
// typing.
export function robust_uri_decode(str) {
    let end = str.length;
    while (end > 0) {
        try {
            return decodeURIComponent(str.slice(0, end));
        } catch (error) {
            if (!(error instanceof URIError)) {
                throw error;
            }
            end -= 1;
        }
    }
    return "";
}

// If we can, use a locale-aware sorter.  However, if the browser
// doesn't support the ECMAScript Internationalization API
// Specification, do a dumb string comparison because
// String.localeCompare is really slow.
export function make_strcmp() {
    try {
        const collator = new Intl.Collator();
        return collator.compare;
    } catch {
        // continue regardless of error
    }

    return function util_strcmp(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
    };
}

export const strcmp = make_strcmp();

export const array_compare = function util_array_compare(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    let i;
    for (i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

/* Represents a value that is expensive to compute and should be
 * computed on demand and then cached.  The value can be forcefully
 * recalculated on the next call to get() by calling reset().
 *
 * You must supply a option to the constructor called compute_value
 * which should be a function that computes the uncached value.
 */
const unassigned_value_sentinel = Symbol("unassigned_value_sentinel");
export class CachedValue {
    _value = unassigned_value_sentinel;

    constructor(opts) {
        this.compute_value = opts.compute_value;
    }

    get() {
        if (this._value === unassigned_value_sentinel) {
            this._value = this.compute_value();
        }
        return this._value;
    }

    reset() {
        this._value = unassigned_value_sentinel;
    }
}

export function find_wildcard_mentions(message_content) {
    const mention = message_content.match(/(^|\s)(@\*{2}(all|everyone|stream)\*{2})($|\s)/);
    if (mention === null) {
        return null;
    }
    return mention[3];
}

export const move_array_elements_to_front = function util_move_array_elements_to_front(
    array,
    selected,
) {
    const selected_hash = new Set(selected);
    const selected_elements = [];
    const unselected_elements = [];
    for (const element of array) {
        (selected_hash.has(element) ? selected_elements : unselected_elements).push(element);
    }
    return [...selected_elements, ...unselected_elements];
};

// check by the userAgent string if a user's client is likely mobile.
export function is_mobile() {
    const regex = "Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini";
    return new RegExp(regex, "i").test(window.navigator.userAgent);
}

export function sorted_ids(ids) {
    // This mapping makes sure we are using ints, and
    // it also makes sure we don't mutate the list.
    let id_list = ids.map((s) => Number.parseInt(s, 10));
    id_list = Array.from(new Set(id_list));
    id_list.sort((a, b) => a - b);

    return id_list;
}

export function set_match_data(target, source) {
    target.match_subject = source.match_subject;
    target.match_content = source.match_content;
}

export function get_match_topic(obj) {
    return obj.match_subject;
}

export function get_edit_event_topic(obj) {
    if (obj.topic === undefined) {
        return obj.subject;
    }

    // This code won't be reachable till we fix the
    // server, but we use it now in tests.
    return obj.topic;
}

export function get_edit_event_orig_topic(obj) {
    return obj.orig_subject;
}

export function is_topic_synonym(operator) {
    return operator === "subject";
}

export function convert_message_topic(message) {
    if (message.topic === undefined) {
        message.topic = message.subject;
    }
}

export function clean_user_content_links(html) {
    const content = new DOMParser().parseFromString(html, "text/html").body;
    for (const elt of content.querySelectorAll("a")) {
        // Ensure that all external links have target="_blank"
        // rel="opener noreferrer".  This ensures that external links
        // never replace the Zulip web app while also protecting
        // against reverse tabnapping attacks, without relying on the
        // correctness of how Zulip's Markdown processor generates links.
        //
        // Fragment links, which we intend to only open within the
        // Zulip web app using our hashchange system, do not require
        // these attributes.
        const href = elt.getAttribute("href");
        let url;
        try {
            url = new URL(href, window.location.href);
        } catch {
            elt.removeAttribute("href");
            elt.removeAttribute("title");
            continue;
        }

        // eslint-disable-next-line no-script-url
        if (["data:", "javascript:", "vbscript:"].includes(url.protocol)) {
            // Remove unsafe links completely.
            elt.removeAttribute("href");
            elt.removeAttribute("title");
            continue;
        }

        // We detect URLs that are just fragments by comparing the URL
        // against a new URL generated using only the hash.
        if (url.hash === "" || url.href !== new URL(url.hash, window.location.href).href) {
            elt.setAttribute("target", "_blank");
            elt.setAttribute("rel", "noopener noreferrer");
        } else {
            elt.removeAttribute("target");
        }

        const is_inline_image =
            elt.parentElement && elt.parentElement.classList.contains("message_inline_image");
        if (is_inline_image) {
            // For inline images we want to handle the tooltips explicitly, and disable
            // the browser's built in handling of the title attribute.
            if (elt.getAttribute("title")) {
                elt.setAttribute("aria-label", elt.getAttribute("title"));
                elt.removeAttribute("title");
            }
        } else {
            // For non-image user uploads, the following block ensures that the title
            // attribute always displays the filename as a security measure.
            let title;
            let legacy_title;
            if (
                url.origin === window.location.origin &&
                url.pathname.startsWith("/user_uploads/")
            ) {
                // We add the word "download" to make clear what will
                // happen when clicking the file.  This is particularly
                // important in the desktop app, where hovering a URL does
                // not display the URL like it does in the web app.
                title = legacy_title = $t(
                    {defaultMessage: "Download {filename}"},
                    {filename: url.pathname.slice(url.pathname.lastIndexOf("/") + 1)},
                );
            } else {
                title = url;
                legacy_title = href;
            }
            elt.setAttribute(
                "title",
                ["", legacy_title].includes(elt.title) ? title : `${title}\n${elt.title}`,
            );
        }
    }
    return content.innerHTML;
}

export function filter_by_word_prefix_match(
    items,
    search_term,
    item_to_text,
    word_separator_regex = /\s/,
) {
    if (search_term === "") {
        return items;
    }

    let search_terms = search_term.toLowerCase().split(",");
    search_terms = search_terms.map((s) => s.trim());

    const filtered_items = items.filter((item) =>
        search_terms.some((search_term) => {
            const lower_name = item_to_text(item).toLowerCase();
            // returns true if the item starts with the search term or if the
            // search term with a word separator right before it appears in the item
            return (
                lower_name.startsWith(search_term) ||
                new RegExp(word_separator_regex.source + _.escapeRegExp(search_term)).test(
                    lower_name,
                )
            );
        }),
    );

    return filtered_items;
}

export function get_time_from_date_muted(date_muted) {
    if (date_muted === undefined) {
        return Date.now();
    }
    return date_muted * 1000;
}

export function call_function_periodically(callback, delay) {
    // We previously used setInterval for this purpose, but
    // empirically observed that after unsuspend, Chrome can end
    // up trying to "catch up" by doing dozens of these requests
    // at once, wasting resources as well as hitting rate limits
    // on the server. We have not been able to reproduce this
    // reliably enough to be certain whether the setInterval
    // requests are those that would have happened while the
    // laptop was suspended or during a window after unsuspend
    // before the user focuses the browser tab.

    // But using setTimeout this instead ensures that we're only
    // scheduling a next call if the browser will actually be
    // calling "callback".
    setTimeout(() => {
        call_function_periodically(callback, delay);
    }, delay);

    callback();
}
