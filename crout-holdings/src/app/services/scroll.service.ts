import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollService {
  /**
   * The query-param key used when redirecting to home before scrolling.
   * e.g.  /?scrollTo=divisions
   */
  static readonly PARAM = 'scrollTo';

  /**
   * Scroll to a section by id.
   * If the element doesn't exist on this page, navigate to the home URL
   * with a `?scrollTo=<id>` query param so the home page can handle it
   * after load.
   *
   * @param id       The DOM id to scroll to
   * @param homeUrl  The root path of the holding-company home page (default '/')
   */
  scrollTo(id: string, homeUrl: string = '/'): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Not on the home page — redirect, then the home page picks up the param
      const sep = homeUrl.includes('?') ? '&' : '?';
      window.location.href = `${homeUrl}${sep}${ScrollService.PARAM}=${id}`;
    }
  }

  /**
   * Call once on home-page init. Reads `?scrollTo=<id>` from the URL,
   * removes the param from history, then scrolls after a short paint delay.
   */
  handleScrollParam(): void {
    const params = new URLSearchParams(window.location.search);
    const id = params.get(ScrollService.PARAM);
    if (!id) return;

    // Clean the URL without reloading
    params.delete(ScrollService.PARAM);
    const clean = params.toString()
      ? `${window.location.pathname}?${params}`
      : window.location.pathname;
    window.history.replaceState(null, '', clean);

    // Wait for Angular to finish rendering before scrolling
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }
}
