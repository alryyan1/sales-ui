// export const host = 'sahara-pharma.com'
export const schema = "http";
export const host = "192.168.100.70";
export const projectFolder = "sales-api";
// export const host = 'server1'مركز النعيم
export function blurForNoramlUsers() {
  // return classname has filter properties
  return "blurForNormalUsers";
}
export const url = `${schema}://${host}/${projectFolder}/public/api/`;
export const webUrl = `${schema}://${host}/${projectFolder}/public/`;
export const imagesUrl = `${schema}://${host}/${projectFolder}/public/`;


  export function formatNumber(number) {
    return String(number).replace(/^\d+/, (number) =>
      [...number]
        .map(
          (digit, index, digits) =>
            (!index || (digits.length - index) % 3 ? "" : ",") + digit
        )
        .join("")
    );
  }