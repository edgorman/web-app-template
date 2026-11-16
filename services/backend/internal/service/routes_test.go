package service

import (
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/edgorman/webapp-template/services/backend/internal/api"
	"github.com/edgorman/webapp-template/services/backend/internal/repository"
)

// The contract must be a valid OpenAPI document, which is what the generators and the typed client
// assume: this is the spec's linter.
func TestSpec_IsValid(t *testing.T) {
	spec, err := api.GetSwagger()
	if err != nil {
		t.Fatal(err)
	}
	if err := spec.Validate(t.Context()); err != nil {
		t.Errorf("packages/api/openapi.yaml is not a valid OpenAPI document: %v", err)
	}
}

// Which routes need a caller is read from each operation's `security` in the spec, so this pins the
// reading against the routes the API actually has: a write that lost its `security` would become
// reachable anonymously.
func TestRouteAuthModes(t *testing.T) {
	modes, err := routeAuthModes()
	if err != nil {
		t.Fatal(err)
	}

	want := map[string]authMode{
		"GET /health":           authNone,
		"GET /debug":            authNone,
		"GET /notes":            authOptional,
		"POST /notes":           authRequired,
		"GET /notes/{id}":       authOptional,
		"PUT /notes/{id}":       authRequired,
		"DELETE /notes/{id}":    authRequired,
		"GET /users/me":         authRequired,
		"PUT /users/me":         authRequired,
		"DELETE /users/me":      authRequired,
		"GET /users/{username}": authOptional,
	}
	for route, mode := range want {
		if got, ok := modes[route]; !ok || got != mode {
			t.Errorf("%s = %v (declared: %v), want %v", route, got, ok, mode)
		}
	}
	if len(modes) != len(want) {
		t.Errorf("the spec declares %d routes, this test knows %d: add the new ones", len(modes), len(want))
	}
}

// The auth modes read from the spec must actually be applied by the handler: a write refused
// without a credential, a read admitting an anonymous caller but refusing a bad credential, and
// the debug routes never looking at one.
func TestHandler_AppliesEachRoutesAuthMode(t *testing.T) {
	status := func(verifier repository.TokenVerifier, method, path string, signedIn bool) int {
		s := New(Config{Logger: slog.New(slog.DiscardHandler)}, newFakeNoteRepository(), newFakeUserRepository(), verifier)
		req := httptest.NewRequest(method, path, nil)
		if signedIn {
			req.Header.Set(authorizationHeader, bearerPrefix+"token")
			req.Header.Set(authorizationProviderHeader, string(providerGoogle))
		}
		rec := httptest.NewRecorder()
		s.Handler().ServeHTTP(rec, req)
		return rec.Result().StatusCode
	}
	good, bad := fakeVerifier{uid: "caller"}, fakeVerifier{err: errors.New("bad token")}

	tests := []struct {
		name     string
		verifier repository.TokenVerifier
		method   string
		path     string
		signedIn bool
		want     int
	}{
		{"required, anonymous", good, http.MethodPost, "/notes", false, http.StatusUnauthorized},
		{"required, bad credential", bad, http.MethodGet, "/users/me", true, http.StatusUnauthorized},
		{"optional, anonymous", good, http.MethodGet, "/notes", false, http.StatusOK},
		{"optional, good credential", good, http.MethodGet, "/notes", true, http.StatusOK},
		{"optional, bad credential", bad, http.MethodGet, "/notes", true, http.StatusUnauthorized},
		{"none, bad credential", bad, http.MethodGet, "/health", true, http.StatusOK},
		{"unknown path", good, http.MethodGet, "/nope", false, http.StatusNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := status(tt.verifier, tt.method, tt.path, tt.signedIn); got != tt.want {
				t.Errorf("%s %s = %d, want %d", tt.method, tt.path, got, tt.want)
			}
		})
	}
}
