function timeConversion(duration) {
  const portions = [];

  let fmt = (duration) => new Intl.NumberFormat().format(duration);

  // for precision sake, we will return the value in milliseconds for fast operations
  if( duration < 5000 ){
    return fmt(duration) + "ms";
  }

  const msInHour = 1000 * 60 * 60;
  const hours = Math.trunc(duration / msInHour);
  if (hours > 0) {
  	// we need to format hours that are very long
    portions.push(fmt(hours) + 'h');
    duration = duration - (hours * msInHour);
  }

  const msInMinute = 1000 * 60;
  const minutes = Math.trunc(duration / msInMinute);
  if (minutes > 0) {
    portions.push(minutes + 'm');
    duration = duration - (minutes * msInMinute);
  }

  // we want to round the seconds, to get better averages
  const seconds = Math.round(duration / 1000);
  if (seconds > 0) {
    portions.push(seconds + 's');
  }

  return portions.join(' ');
}

function getEpochMilliseconds(){
	return (new Date()).getTime();
}

function timerFormat(milliseconds){
	const seconds = Math.trunc(milliseconds/1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return [
    h,
    m > 9 ? m : (h ? '0' + m : m || '0'),
    s > 9 ? s : '0' + s
  ].filter(Boolean).join(':');
}

module.exports = {
	  timeConversion: timeConversion
	, timerFormat: timerFormat
	, getEpochMilliseconds: getEpochMilliseconds
};
