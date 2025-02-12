/**
 * The options that specify the metadata of the encoding image.
 */
export interface PNGOptions {
  width: number;
  height: number;
  /**
   * The PNG spec only standardises one compression method, zlib, which is
   * selected with the value zero.
   */
  compression: 0;
  /**
   * The PNG spec only standardises one filter method, which is selected with
   * the value zero.
   */
  filter: 0;
  /**
   * The PNG spec offers either no interlacing, selected with the value zero, or
   * Adam7 interlacing, selected with the value 1.
   */
  interlace: 0 | 1;
}
