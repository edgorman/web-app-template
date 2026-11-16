package main

import (
	"context"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/edgorman/webapp-template/services/backend/internal/repository/devauth"
	"github.com/edgorman/webapp-template/services/backend/internal/repository/google"
)

// The development verifier signs anybody in as anybody, so every environment but local must refuse
// to start with it - including the unset ENVIRONMENT a misconfigured deployment would have.
func TestTokenVerifier_DevAuthOnlyLocal(t *testing.T) {
	for _, environment := range []string{"development", "stag", "staging", "prod", "Local", ""} {
		if verifier, err := tokenVerifier(environment, true, "client"); err == nil {
			t.Errorf("tokenVerifier(%q, devAuth) = %T, want an error", environment, verifier)
		}
	}

	verifier, err := tokenVerifier("local", true, "")
	if _, ok := verifier.(devauth.TokenVerifier); err != nil || !ok {
		t.Errorf("tokenVerifier(local, devAuth) = %T, %v; want the development verifier", verifier, err)
	}
	for _, environment := range []string{"local", "prod"} {
		verifier, err := tokenVerifier(environment, false, "client")
		if _, ok := verifier.(*google.TokenVerifier); err != nil || !ok {
			t.Errorf("tokenVerifier(%q) = %T, %v; want the Google verifier", environment, verifier, err)
		}
	}
}

// A request in flight when the context is cancelled (SIGTERM in production) must still be answered,
// and a signalled shutdown is a clean exit rather than http.ErrServerClosed.
func TestServe_DrainsInFlightRequests(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	server := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		close(started)
		<-release
		w.WriteHeader(http.StatusOK)
	})}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	stopped := make(chan error, 1)
	go func() { stopped <- serve(ctx, server, listener, 5*time.Second) }()

	status := make(chan int, 1)
	go func() {
		response, err := http.Get("http://" + listener.Addr().String())
		if err != nil {
			status <- 0
			return
		}
		response.Body.Close()
		status <- response.StatusCode
	}()

	<-started
	cancel()
	select {
	case err := <-stopped:
		t.Fatalf("serve returned %v before the in-flight request finished", err)
	case <-time.After(100 * time.Millisecond):
	}
	close(release)

	if got := <-status; got != http.StatusOK {
		t.Errorf("in-flight request status = %d, want 200", got)
	}
	if err := <-stopped; err != nil {
		t.Errorf("serve = %v, want nil after a signalled shutdown", err)
	}
}
