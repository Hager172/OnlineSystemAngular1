import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

/** Rich body / auto-close / custom button label — the uncommon knobs. */
export interface PopupExtras {
  /** Body markup. Use instead of `message` when the text needs a list or <b>. */
  html?: string;
  /** Auto-close after N ms. The OK button is hidden when set. */
  timer?: number;
  /** Label of the dismiss button. Defaults to OK. */
  confirmText?: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Body markup, instead of `message`. */
  html?: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button, for destructive actions (cancel/delete). */
  danger?: boolean;
}

/**
 * The one popup for the whole app. Every message, confirm and blocking spinner
 * goes through here — no component should call `alert`, `confirm` or Swal
 * directly, so the look stays consistent in one place.
 *
 * Wraps SweetAlert2 (already a dependency) and dresses it in the portal's
 * design via the `.pp-popup*` classes themed in `src/styles.css`.
 */
@Injectable({ providedIn: 'root' })
export class PopupService {
  /** Portal look, shared by every popup. Buttons are styled by our CSS. */
  private readonly base = {
    buttonsStyling: false,
    customClass: {
      container: 'pp-popup__container',
      popup: 'pp-popup',
      title: 'pp-popup__title',
      htmlContainer: 'pp-popup__body',
      actions: 'pp-popup__actions',
      confirmButton: 'pp-popup__btn pp-popup__btn--primary',
      cancelButton: 'pp-popup__btn pp-popup__btn--ghost',
    },
  };

  /** Something worked. */
  success(title: string, message?: string, extras: PopupExtras = {}): Promise<void> {
    return this.show('success', title, message, extras);
  }

  /** Something failed. */
  error(title: string, message?: string, extras: PopupExtras = {}): Promise<void> {
    return this.show('error', title, message, extras);
  }

  /** Nothing broke, but the user can't continue as-is. */
  warning(title: string, message?: string, extras: PopupExtras = {}): Promise<void> {
    return this.show('warning', title, message, extras);
  }

  /** Neutral notice. */
  info(title: string, message?: string, extras: PopupExtras = {}): Promise<void> {
    return this.show('info', title, message, extras);
  }

  /** Ask before doing something. Resolves true only when confirmed. */
  confirm(options: ConfirmOptions): Promise<boolean> {
    return Swal.fire({
      ...this.base,
      icon: 'question',
      title: options.title,
      text: options.html ? undefined : options.message,
      html: options.html,
      showCancelButton: true,
      // the safe choice sits on the right and takes focus
      reverseButtons: true,
      focusCancel: true,
      confirmButtonText: options.confirmText ?? 'Yes',
      cancelButtonText: options.cancelText ?? 'Cancel',
      customClass: {
        ...this.base.customClass,
        confirmButton: `pp-popup__btn ${options.danger ? 'pp-popup__btn--danger' : 'pp-popup__btn--primary'}`,
      },
    }).then(result => result.isConfirmed);
  }

  /** Blocking spinner for work the user must wait on. Always pair with close(). */
  loading(title = 'Please wait...'): void {
    Swal.fire({
      ...this.base,
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
  }

  /** Closes whatever is open — mainly to dismiss loading(). */
  close(): void {
    Swal.close();
  }

  private show(
    icon: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string | undefined,
    extras: PopupExtras
  ): Promise<void> {
    return Swal.fire({
      ...this.base,
      icon,
      title,
      text: extras.html ? undefined : message,
      html: extras.html,
      timer: extras.timer,
      showConfirmButton: !extras.timer,
      confirmButtonText: extras.confirmText ?? 'OK',
    }).then(() => undefined);
  }
}
