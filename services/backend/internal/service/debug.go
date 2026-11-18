package service

import (
	"net/http"
	"time"

	"github.com/edgorman/webapp-template/services/backend/internal/api"
)

// GetHealth and GetDebug answer the Debug Endpoint Contract (docs/decisions/0004-debug-endpoint-contract.md). The GCP uptime
// check matches the literal `"status":"ok"` substring, so that field's spelling is load-bearing.
func (s *Service) GetHealth(w http.ResponseWriter, _ *http.Request) { s.debug(w) }

func (s *Service) GetDebug(w http.ResponseWriter, _ *http.Request) { s.debug(w) }

func (s *Service) debug(w http.ResponseWriter) {
	writeJSON(w, http.StatusOK, api.DebugResponse{
		Status:      "ok",
		Timestamp:   time.Now().UTC().Truncate(time.Second),
		Environment: s.cfg.Environment,
		Commit:      s.cfg.Commit,
	})
}
