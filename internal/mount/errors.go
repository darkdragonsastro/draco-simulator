package mount

import "errors"

var (
	errNotConnected = errors.New("mount not connected")
	errParked       = errors.New("mount is parked")
)
